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

test("quick owner edits validate contact fields and allow explicit removal",()=>{
 assert.deepEqual(quickPropertySchema.parse({owner:{name:" Owner name ",phone:"0551234567",email:"owner@example.com",notes:"Contact note"}}),{owner:{name:"Owner name",phone:"0551234567",email:"owner@example.com",notes:"Contact note"}});
 assert.deepEqual(quickPropertySchema.parse({owner:null}),{owner:null});
 for(const owner of [{name:"A",phone:"0551234567"},{name:"Owner",phone:"1"},{name:"Owner",phone:"0551234567",email:"invalid"},{name:"Owner",phone:"0551234567",role:"admin"}])assert.equal(quickPropertySchema.safeParse({owner}).success,false);
});
