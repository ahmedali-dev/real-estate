import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

test("a model cached before offer fields existed is replaced and retains saved offer attribution", async () => {
  mongoose.model("Property", new mongoose.Schema({ title: String }));
  const { Property } = await import("../models/Property");
  const { serializeProperty } = await import("../lib/mongodb/serialize");
  assert.ok(Property.schema.path("broughtBy.userId"));
  assert.ok(Property.schema.path("propertyType"));
  const doc = new Property({ title: "Villa listing", category: "apartment", propertyType: "villa", listingType: "sale", description: "A spacious family villa.", broughtBy: { userId: "507f1f77bcf86cd799439011", name: "Khalid" } });
  await doc.validate();
  doc.createdAt = doc.updatedAt = new Date();
  const result = serializeProperty(doc, true);
  assert.equal(result.broughtBy?.name, "Khalid");
  assert.equal(result.broughtBy?.userId, "507f1f77bcf86cd799439011");
  assert.equal(result.propertyType, "villa");
});
