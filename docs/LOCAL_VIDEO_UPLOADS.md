# Optional video uploads — local and online

Administrators configure uploads at `/dashboard/video-upload`, available from the sidebar under **Video upload settings**. Choose **Local** or **Online**, enable/disable uploads, save each server URL and optional API key, then check the saved connection. The chosen mode applies to all app servers sharing this database.

- **Local:** the video server can use a loopback URL or a private LAN IPv4 address (10.x.x.x, 172.16–31.x.x or 192.168.x.x), for example `http://192.168.1.200:8000`. The app server must be able to reach that address. Uploads appear only with `npm run dev` when browsing localhost, 127.0.0.1 or IPv6 loopback.
- **Online:** the video server must use HTTPS and cannot be localhost. Authorized listing staff can upload on the published app as well as locally. The app proxies requests, so the video server does not need browser CORS rules.
- **Disabled:** the uploader is hidden and requests are rejected; saved video references and files are retained.

Apartment, building and land forms use the selected mode. Existing TikTok and image features continue independently. No setting has been enabled or changed automatically in your database.

Start the separate video API described in your API_GUIDE.md, then configure `.env.local`:

```dotenv
VIDEO_UPLOAD_API_URL=http://127.0.0.1:8000
VIDEO_UPLOAD_API_KEY=your-video-server-key
```

Environment values are used until settings are first saved. The URL defaults to `http://127.0.0.1:8000`. Omit the key only if your video service does not require authentication. Restart Next.js after changing environment variables. Use a stable `NEXTAUTH_SECRET`; it encrypts saved keys and signs upload tickets and completion references. Keep it consistent across servers sharing the database. Saved keys are never returned by the settings API. Leave a key blank to keep it, or select **No API key** to explicitly clear it. Changing the server host requires re-entering the key to avoid forwarding an existing credential to a new destination.

Choose a video, click **Upload / resume**, wait for verification, then save the listing. Video is optional. Files can be MP4, MOV, M4V, MKV, WebM or AVI, up to 20 GB. The service validates file content. The browser hashes incrementally and sends 2 MB chunks through an authenticated, same-origin server proxy; the video service key never reaches the browser.

**Pause** stops the current request. Reselect the same file and click **Upload / resume** to continue using the server's confirmed offset. Temporary upload tickets are retained in this browser's local storage; tickets are scoped to the signed-in user and configured backend and expire after 24 hours. Transient chunk failures retry up to five times. Verification can take several minutes. If it times out, resume to confirm completion rather than upload again.

A successful completion returns a signed file reference saved privately with the property. Public property responses omit it. **Detach** removes the reference on the next listing save; it does not delete the completed file from the video server. Unfinished files are left for the service's 24-hour expiry cleanup.

The supplied API guide defines uploads and video listing, but no download/playback route. Consequently this feature stores the verified video reference and does not invent a public playback URL or embed a player. A playback endpoint is required before videos can be shown to visitors.

The connection check requests `/health` and expects successful JSON. It checks reachability, not a complete upload. Large production uploads require a host/proxy that permits 2 MB request bodies and up to four minutes for completion verification. Check the limits of your hosting plan and video server.
