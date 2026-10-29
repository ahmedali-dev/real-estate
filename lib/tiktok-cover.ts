import { tiktokUrl } from './tiktok-lookup';

type Metadata = { thumbnail_url?: string; title?: string; author_name?: string };
const headers = { Accept: 'text/html,application/json', 'User-Agent': 'Mozilla/5.0' };
/** Read only the requested video's metadata, never a recommended video's cover. */
export function embeddedTikTokCover(html: string, videoId: string): string | undefined {
  for (const id of ['__UNIVERSAL_DATA_FOR_REHYDRATION__', 'SIGI_STATE']) {
    const script = (html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || []).find(tag => new RegExp(`\\bid=["']${id}["']`).test(tag));
    if (!script) continue;
    try {
      const data = JSON.parse(script.slice(script.indexOf('>') + 1, script.lastIndexOf('</')));
      const item = id === 'SIGI_STATE' ? data.ItemModule?.[videoId] : data.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
      if (!item || String(item.id) !== videoId) continue;
      for (const key of ['cover', 'originCover', 'dynamicCover']) {
        const candidate = item.video?.[key];
        const url = typeof candidate === 'string' ? candidate : candidate?.urlList?.[0];
        if (typeof url === 'string' && /^https:\/\//i.test(url)) return url;
      }
    } catch { /* Ignore malformed metadata and try the next supported payload. */ }
  }
}
export async function getTikTokCover(value: string, fetcher = fetch): Promise<Metadata> {
  let url = tiktokUrl(value);
  if (!url) throw new Error('Enter a valid HTTPS TikTok video link.');
  // Mobile share links must be expanded before oEmbed can identify the video.
  for (let hop = 0; !/\/video\/\d+/.test(url.pathname) && hop < 5; hop++) {
    const response = await fetcher(url.href, { headers, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(6000) });
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) break;
    const next = tiktokUrl(new URL(location, url).href);
    if (!next) throw new Error('TikTok returned an unsupported redirect. Use the full video link.');
    url = next;
  }
  const response = await fetcher(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url.href)}`, {
    headers, cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  const metadata: Metadata = response.ok ? await response.json().catch(() => ({})) : {};
  if (metadata.thumbnail_url) return metadata;
  // Some public videos omit the optional oEmbed thumbnail but expose an Open Graph cover.
  const page = await fetcher(url.href, { headers, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (page.ok) {
    const html = await page.text();
    if (/SlardarWAF|waf-aiso|captcha-verify/i.test(html)) {
      throw new Error("TikTok blocked automatic cover fetching with browser verification. Upload the cover image from your device; the video link can still be saved.");
    }
    const videoId = url.pathname.match(/\/video\/(\d+)/)?.[1];
    const embeddedCover = videoId ? embeddedTikTokCover(html, videoId) : undefined;
    if (embeddedCover) return { ...metadata, thumbnail_url: embeddedCover };
    for (const tag of html.match(/<meta\s[^>]*>/gi) || []) {
      const attributes = Object.fromEntries(Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)).map(match => [match[1].toLowerCase(), match[3]]));
      if (attributes.property === 'og:image' || attributes.name === 'og:image') {
        const cover = attributes.content?.replace(/&amp;/g, '&');
        if (cover && /^https:\/\//i.test(cover)) return { ...metadata, thumbnail_url: cover };
      }
    }
  }
  throw new Error("TikTok didn't provide a cover. Check that the video is public, or upload a cover from your device.");
}
