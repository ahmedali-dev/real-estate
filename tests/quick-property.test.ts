import test from "node:test";
import assert from "node:assert/strict";
import { quickPropertySchema } from "../lib/validations/quick-property";

test("quick edits allow removing optional values without requiring the full listing", () => {
  assert.equal(quickPropertySchema.safeParse({ price: null, tiktokUrl: "", mapUrl: "" }).success, true);
  assert.deepEqual(quickPropertySchema.parse({ status: "rented" }), { status: "rented" });
});
test("quick edits reject unrelated fields and invalid prices and links", () => {
  for (const input of [{}, { title: "Unexpected change" }, { price: -1 }, { price: 0 }, { tiktokUrl: "https://tiktok.com.evil.example/video/1" }, { mapUrl: "https://example.com" }]) {
    assert.equal(quickPropertySchema.safeParse(input).success, false);
  }
});
test("quick description edits enforce the same limits as full editing", () => {
  assert.deepEqual(quickPropertySchema.parse({description:"  A complete property description.  "}), {description:"A complete property description."});
  for (const description of ["", "short", "x".repeat(5001)]) assert.equal(quickPropertySchema.safeParse({description}).success, false);
});
