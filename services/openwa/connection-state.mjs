const states = new Set(["AUTHENTICATING", "CONFLICT", "CONNECTED", "DISCONNECTED", "PAIRING", "READY", "STARTING", "STOPPED", "SYNCING", "TIMEOUT", "UNLAUNCHED"]);

/** OpenWA v5 READY is the point where authentication and startup are complete. */
export function openwaConnectionSnapshot(runtime) {
  let state = "DISCONNECTED";
  try {
    const actual = runtime?.client?.getState?.();
    if (typeof actual === "string" && states.has(actual)) state = actual;
  } catch { /* Treat state read failures as disconnected. */ }
  return { connected: state === "READY", state };
}
