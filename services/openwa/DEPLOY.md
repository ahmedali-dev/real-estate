# Standalone WhatsApp service

Upload **only this `services/openwa` folder** to your Linux server. It has its own package, lockfile, launcher, configuration, and gateway; it does not import the Next.js application or require MongoDB.

## Install and start

Use Node.js **22.22.2** and install Chrome/Chromium's required system libraries for your Linux distribution. The browser must be able to run with the host's normal sandbox support.

```sh
cp .env.example .env
openssl rand -hex 32
# Edit .env: use the generated secret as OPENWA_API_KEY,
# and set WHATSAPP_WEBHOOK_URL to your website endpoint.
npm ci
npm start
```

Keep `.env` private. Preserve the `_IGNORE_property-office` directory across restarts; it contains the linked WhatsApp browser session. Do not upload local node_modules or an old session to a public repository.

The gateway listens on **127.0.0.1:8080**; the internal OpenWA API uses port 8081. Set PORT to change both (the internal port is PORT + 1). Use a service manager such as systemd to keep `npm start` running, with this folder as WorkingDirectory and a non-root service account. Back up the session directory privately.

## HTTPS reverse proxy

Point a subdomain such as `whatsapp.example.com` at the server and configure a TLS reverse proxy to the gateway. Do not expose the internal port. All gateway routes require the matching `X-API-Key`, including `/health`, which can contain pairing data.

Example Nginx location inside your existing HTTPS server block:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-API-Key $http_x_api_key;
    proxy_read_timeout 65s;
}
```

Use your normal certificate provisioning and firewall configuration. No inbound access to port 8081 is needed.

## Connect the website

1. Sign in as admin and open `/dashboard/whatsapp`.
2. Set WhatsApp server URL to `https://whatsapp.example.com`.
3. Enter the same API key as the service's `.env`.
4. Set the public property website URL and automatic reply language.
5. Save, check connection, and scan the pairing QR with WhatsApp → Linked devices.

The gateway captures the OpenWA CLI's generated pairing QR and serves it through authenticated `GET /office/connection`; this lets the website display the QR even if `/health` reports `qr: null`. Restart the service after updating this folder, and keep the ngrok or HTTPS reverse proxy pointed at the gateway port (8080 by default), not the internal OpenWA port (8081).

Settings are stored in MongoDB. The API key is encrypted using the website's NEXTAUTH_SECRET; preserve that secret or re-enter the key after changing it. The key is never returned to the browser by the settings API. Existing environment settings remain the fallback until admin settings are saved.

Website settings do not rewrite the remote service's `.env`. Set WHATSAPP_WEBHOOK_URL on the service itself and restart it after changing that value or its API key. The webhook and outbound API currently share the same key.

Free-mode text sharing and incoming TikTok lookup are retained. Check the account before retrying an unconfirmed send. This is unofficial WhatsApp automation.

## Website settings API

Admin session required:

- `GET /api/whatsapp/settings`: returns URL, public site URL, reply locale, and `hasKey`; never returns the secret.
- `PUT /api/whatsapp/settings`: accepts `{ url, apiKey, siteUrl, replyLocale }` and requires the website's same-origin Origin header. Leave apiKey empty to keep the saved key. Remote URLs require HTTPS; loopback development permits HTTP.
