import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import manifest from "../app/manifest";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
function worker(online: boolean) {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const writes: string[] = [];
  const fallback = new Response("Generic offline page");
  runInNewContext(source, {
    URL, Response,
    self: { location: { origin:"https://example.com" }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; }, clients: { claim: async () => {} } },
    fetch: async () => { if (!online) throw new Error("offline"); return new Response("Live content"); },
    caches: { open: async () => ({ add: async (path: string) => { writes.push(path); } }), match: async () => fallback, keys: async () => [], delete: async () => true },
  });
  return { handlers, writes };
}
test("manifest provides standalone installation and both required PNG sizes", () => {
  const data = manifest();
  assert.equal(data.display, "standalone");
  assert.equal(data.start_url, "/");
  assert.equal(data.scope, "/");
  for (const size of ["192x192", "512x512"]) assert.ok(data.icons?.some(icon => icon.sizes === size && icon.type === "image/png"));
});
test("worker precaches only the generic offline page", async () => {
  const {handlers,writes} = worker(true);
  let pending: Promise<unknown> | undefined;
  handlers.install({waitUntil: (promise: Promise<unknown>) => {pending = promise;}});
  await pending;
  assert.deepEqual(writes, ["/offline.html"]);
});
test("worker leaves APIs alone and uses network-only navigation with offline fallback", async () => {
  for (const online of [true, false]) {
    const {handlers,writes} = worker(online);
    let pending: Promise<Response> | undefined;
    const respondWith = (promise: Promise<Response>) => { pending = promise; };
    handlers.fetch({request:{url:"https://example.com/api/properties",mode:"cors"},respondWith});
    assert.equal(pending, undefined);
    handlers.fetch({request:{url:"https://example.com/dashboard",mode:"navigate"},respondWith});
    assert.equal(await (await pending!).text(), online ? "Live content" : "Generic offline page");
    assert.deepEqual(writes, []);
  }
});
