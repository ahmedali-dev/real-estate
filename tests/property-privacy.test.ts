import test from "node:test";
import assert from "node:assert/strict";
import { Property } from "../models/Property";
import { serializeProperty } from "../lib/mongodb/serialize";

function listing() {
  return new Property({ title: "Example building", description: "A building description", category: "build", listingType: "rent", rentalPeriod: "monthly", status: "available", visibility: "public", price: 1000,
    owner: { name: "PRIVATE_OWNER", phone: "PRIVATE_PHONE", email: "owner@example.com" },
    tenant: { name: "PRIVATE_TENANT", idNumber: "PRIVATE_ID", phone: "PRIVATE_PHONE" },
    broughtBy: { userId: "507f1f77bcf86cd799439011", name: "PRIVATE_OFFICER" },
    details: { rooms: 3, residencyType: "family" },
    units: [{ name: "1", rooms: 2, electricityNumber: "PRIVATE_METER", residencyType: "family", tenant: { name: "PRIVATE_UNIT_TENANT", idNumber: "PRIVATE_UNIT_ID" } }],
    createdAt: new Date(), updatedAt: new Date() });
}
test("public serialization removes private fields including nested units by default", () => {
  const dto = serializeProperty(listing()); const json = JSON.stringify(dto);
  assert.doesNotMatch(json, /PRIVATE_|owner@example.com|residencyType|electricityNumber|broughtBy/);
  assert.equal(dto.title, "Example building"); assert.equal(dto.price, 1000);
  assert.equal(dto.details?.rooms, 3); assert.equal(dto.units[0].rooms, 2);
});
test("explicit staff serialization retains data required by edit forms", () => {
  const dto = serializeProperty(listing(), true);
  assert.equal(dto.owner?.name, "PRIVATE_OWNER"); assert.equal(dto.tenant?.idNumber, "PRIVATE_ID");
  assert.equal(dto.units[0].electricityNumber, "PRIVATE_METER"); assert.equal(dto.units[0].tenant?.idNumber, "PRIVATE_UNIT_ID");
  assert.equal(dto.broughtBy?.name, "PRIVATE_OFFICER");
});
