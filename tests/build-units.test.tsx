import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BuildUnitsForm, emptyUnit } from "../components/forms/BuildUnitsForm";
import { LanguageProvider } from "../lib/i18n/LanguageProvider";
import { propertyInputSchema } from "../lib/validations/property";
import { Property } from "../models/Property";
import { serializeProperty } from "../lib/mongodb/serialize";

const listing = { title: "Residential building", category: "build", listingType: "sale", description: "Building with individual rented and available apartments." };

test("building apartments have one number field and no name or suitability fields", () => {
  const html = renderToStaticMarkup(<LanguageProvider><BuildUnitsForm units={[{ ...emptyUnit(), number: "104" }]} onChange={() => {}} /></LanguageProvider>);
  assert.ok(html.includes('id="unit-number-0"'));
  assert.ok(!html.includes('id="unit-name-0"'));
  assert.ok(!html.includes('unit-residency-0'));
  assert.ok(html.includes("This apartment is rented"));
  assert.ok(!html.includes('id="unit-tenant-name-0"'));
});

test("rented apartments expose tenant inputs", () => {
  const html = renderToStaticMarkup(<LanguageProvider><BuildUnitsForm units={[{ ...emptyUnit(), number: "104", isRented: true }]} onChange={() => {}} /></LanguageProvider>);
  assert.ok(html.includes('id="unit-tenant-name-0"'));
});

test("rented apartment and tenant information persist in a building for sale", async () => {
  const input = propertyInputSchema.parse({ ...listing, units: [{ number: "104", rooms: 3, isRented: true, tenant: { name: "Example tenant" } }] });
  const doc = new Property(input);
  await doc.validate();
  doc.createdAt = new Date(); doc.updatedAt = new Date();
  const result = serializeProperty(doc, true);
  assert.equal(result.units[0].isRented, true);
  assert.equal(result.units[0].tenant?.name, "Example tenant");
  assert.equal(result.units[0].number, "104");
  assert.equal(result.units[0].rooms, 3);
});

test("turning rented off clears tenant data and preserves apartment details", async () => {
  const doc = new Property({ ...listing, listingType: "rent", rentalPeriod: "monthly", units: [{ number: "104", rooms: 3, isRented: false, tenant: { name: "Former tenant" } }] });
  await doc.validate();
  assert.equal(doc.units[0].tenant, undefined);
  assert.equal(doc.units[0].number, "104");
  assert.equal(doc.units[0].rooms, 3);
});

test("older rental apartments infer occupancy from existing tenant information", async () => {
  const doc = new Property({ ...listing, listingType: "rent", rentalPeriod: "monthly", units: [{ name: "Legacy apartment", tenant: { name: "Example tenant" } }] });
  await doc.validate();
  doc.createdAt = new Date(); doc.updatedAt = new Date();
  assert.equal(serializeProperty(doc, true).units[0].isRented, true);
});
