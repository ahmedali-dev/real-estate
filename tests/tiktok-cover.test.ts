import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTikTokCover } from '../lib/tiktok-cover';

test('expands mobile share links before requesting a cover', async () => {
  const urls: string[] = [];
  const result = await getTikTokCover('https://vm.tiktok.com/abc/', async input => {
    urls.push(String(input));
    return urls.length === 1 ? new Response(null, { status: 302, headers: { location: 'https://www.tiktok.com/@office/video/123?tracking=1' } }) : Response.json({ thumbnail_url: 'https://cdn.example/cover.jpg' });
  });
  assert.equal(result.thumbnail_url, 'https://cdn.example/cover.jpg');
  assert.equal(new URL(urls[1]).searchParams.get('url'), 'https://www.tiktok.com/@office/video/123');
});
test('uses public page cover when oEmbed omits its thumbnail', async () => {
  let calls = 0;
  const result = await getTikTokCover('https://www.tiktok.com/@office/video/123', async () => ++calls === 1 ? Response.json({ title: 'Home' }) : new Response('<meta content="https://cdn.example/cover.jpg?a=1&amp;b=2" property="og:image">'));
  assert.equal(result.thumbnail_url, 'https://cdn.example/cover.jpg?a=1&b=2');
  assert.equal(result.title, 'Home');
});
test('rejects redirects outside TikTok before following them', async () => {
  let calls = 0;
  await assert.rejects(getTikTokCover('https://vm.tiktok.com/abc/', async () => { calls++; return new Response(null, {status:302,headers:{location:'http://localhost/private'}}); }), /unsupported redirect/);
  assert.equal(calls, 1);
});
test('reports unavailable covers without returning a broken image', async () => {
  await assert.rejects(getTikTokCover('https://www.tiktok.com/@office/video/123', async () => new Response('',{status:404})), /upload a cover/);
});

test('reads the requested video cover from TikTok embedded metadata', async () => {
  let calls = 0;
  const html = '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.video-detail':{itemInfo:{itemStruct:{id:'123',video:{cover:'https://cdn.example/real-cover.jpg'}}}}}})+'</script>';
  const result = await getTikTokCover('https://www.tiktok.com/@office/video/123', async () => ++calls === 1 ? new Response('<html>Unavailable</html>') : new Response(html));
  assert.equal(result.thumbnail_url, 'https://cdn.example/real-cover.jpg');
});
test('does not use a recommended video cover for the requested listing', async () => {
  const html = '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.video-detail':{itemInfo:{itemStruct:{id:'999',video:{cover:'https://cdn.example/wrong.jpg'}}}}}})+'</script>';
  let calls = 0;
  await assert.rejects(getTikTokCover('https://www.tiktok.com/@office/video/123', async () => ++calls === 1 ? Response.json({}) : new Response(html)), /upload a cover/);
});
test('identifies TikTok browser verification rather than blaming video visibility', async () => {
  let calls = 0;
  await assert.rejects(getTikTokCover('https://www.tiktok.com/@office/video/123', async () => ++calls === 1 ? Response.json({type:'video',html:'<iframe></iframe>'}) : new Response('<script>SlardarWAF</script>')), /browser verification/);
});
