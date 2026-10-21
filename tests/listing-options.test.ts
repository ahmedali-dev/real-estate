import assert from "node:assert/strict";
import { test } from "node:test";
import { propertyInputSchema } from "../lib/validations/property";
import { googleMapEmbedUrl, isGoogleMapsUrl } from "../lib/maps";
import { Property } from "../models/Property";
import { serializeProperty } from "../lib/mongodb/serialize";

const listing = { title: "Sample apartment", category: "apartment", listingType: "sale", description: "A spacious apartment near the city center." };

test("listings can omit price, owner and details", () => {
  const parsed = propertyInputSchema.parse(listing);
  assert.equal(parsed.price, undefined);
  assert.equal(parsed.owner, undefined);
  assert.equal(parsed.details, undefined);
});

test("provided prices and owner information still require valid values", () => {
  for (const price of ["", 0, -1, "not a price", null]) {
    assert.equal(propertyInputSchema.safeParse({ ...listing, price }).success, false);
  }
  assert.equal(propertyInputSchema.safeParse({ ...listing, owner: { name: "", phone: "" } }).success, false);
  assert.equal(propertyInputSchema.parse({ ...listing, price: "250000" }).price, 250000);
});

test("URL-only locations and installed AC survive database serialization", async () => {
  const input = propertyInputSchema.parse({ ...listing, location: { mapUrl: "https://maps.app.goo.gl/example" }, details: { rooms: 3, bathrooms: 2, acInstalled: true } });
  const doc = new Property(input);
  await doc.validate();
  doc.createdAt = new Date();
  doc.updatedAt = new Date();
  const result = serializeProperty(doc, true);
  assert.equal(result.location?.mapUrl, input.location?.mapUrl);
  assert.equal(result.location?.city, undefined);
  assert.equal(result.details?.acInstalled, true);
  assert.equal(result.price, undefined);
});

test("rental and land business rules remain enforced", () => {
  assert.equal(propertyInputSchema.safeParse({ ...listing, listingType: "rent" }).success, false);
  assert.equal(propertyInputSchema.safeParse({ ...listing, listingType: "rent", rentalPeriod: "monthly" }).success, true);
  assert.equal(propertyInputSchema.safeParse({ ...listing, category: "land", listingType: "rent", rentalPeriod: "monthly" }).success, false);
});

test("maps prefer the property marker to the camera center", () => {
  const embed = googleMapEmbedUrl("https://www.google.com/maps/place/Example/@24.8,46.8,15z/data=!3d24.7!4d46.7");
  assert.equal(embed, "https://www.google.com/maps?q=24.7%2C46.7&output=embed");
  assert.equal(googleMapEmbedUrl("https://www.google.com/maps?q=24.7,46.7"), embed);
});

test("maps reject unsafe hosts and malformed URL encoding", () => {
  for (const url of ["https://evil.example/maps", "https://www.google.com.evil.example/maps", "http://127.0.0.1/maps", "javascript:alert(1)", "https://user:pass@google.com/maps", "https://www.google.com/maps/%ZZ"]) {
    assert.equal(isGoogleMapsUrl(url), false);
    assert.equal(googleMapEmbedUrl(url), null);
  }
});

test("property types and offer source survive storage and serialization", async () => {
  const userId = "507f1f77bcf86cd799439011";
  for (const propertyType of ["villa", "apartment", "duplex", "floor", "shop", "other"]) {
    const parsed = propertyInputSchema.parse({ ...listing, propertyType, broughtByUserId: userId });
    assert.equal(parsed.broughtByUserId, userId);
    const doc = new Property({ ...parsed, broughtBy: { userId, name: "Ali" } });
    await doc.validate();
    doc.createdAt = doc.updatedAt = new Date();
    const saved = serializeProperty(doc, true);
    assert.equal(saved.propertyType, propertyType);
    assert.deepEqual(saved.broughtBy, { userId, name: "Ali" });
  }
  assert.equal(propertyInputSchema.safeParse({ ...listing, propertyType: "invalid" }).success, false);
  assert.equal(propertyInputSchema.safeParse({ ...listing, broughtByUserId: "Ali" }).success, false);
});
