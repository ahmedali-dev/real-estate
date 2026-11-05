import assert from "node:assert/strict";
import test from "node:test";
import { commissionAmount, managementInput } from "../lib/property-management";
import { serializeProperty } from "../lib/mongodb/serialize";
import { Property } from "../models/Property";

const propertyId = "0123456789abcdef01234567";
const input = { propertyId, commissionRate: 10, status: "sold", transactionAmount: 125000, notes: "Office-only note" };

test("management accepts the commission endpoints and rejects out-of-range rates", () => {
  for (const commissionRate of [5, 10, 15]) assert.ok(managementInput.safeParse({ ...input, commissionRate }).success);
  for (const commissionRate of [4, 16, 5.5, "10"]) assert.equal(managementInput.safeParse({ ...input, commissionRate }).success, false);
  assert.equal(managementInput.safeParse({ ...input, transactionAmount: -1 }).success, false);
  assert.equal(managementInput.safeParse({ ...input, title: "Unauthorized field" }).success, false);
});

test("commission is calculated on the agreed amount and rounded to halalas", () => {
  assert.equal(commissionAmount(125000, 10), 12500);
  assert.equal(commissionAmount(123.45, 15), 18.52);
});

test("management details stay on the listing and are omitted from public serialization", async () => {
  const doc = new Property({
    title: "Managed property", category: "land", listingType: "sale", description: "A managed land listing.",
    createdAt: new Date(), updatedAt: new Date(),
    management: { commissionRate: 10, transactionAmount: 125000, notes: "Office-only note" },
  });
  await doc.validate();
  assert.equal(doc.toObject().management?.commissionRate, 10);
  assert.equal("management" in serializeProperty(doc), false);
  assert.equal(JSON.stringify(serializeProperty(doc)).includes("Office-only note"), false);
});
