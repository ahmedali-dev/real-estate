// Run with the OpenWA v5 Easy API CLI, separately from Next.js.
// The shell/service manager must supply these variables.
if (!process.env.OPENWA_API_KEY) {
  throw new Error("Set OPENWA_API_KEY before starting OpenWA.");
}

export default {
  apiKey: process.env.OPENWA_API_KEY,
  // Free mode: do not apply paid or invalid license material.
  // Show the pairing QR in the service terminal; the website only checks state.
  qrLogSkip: false,
  qrTimeout: 0,
  authTimeout: 0,
  // Keep the previous 5.1 browser profile intact; it can contain stale auth
  // state that prevents the current WhatsApp Web QR flow from starting.
  userDataDir: process.env.WA_USER_DATA_DIR || "./_IGNORE_property-office-user-v5-10",
};
