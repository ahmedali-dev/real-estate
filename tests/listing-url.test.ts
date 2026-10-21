import test from "node:test";
import assert from "node:assert/strict";
import { readListingUrl, writeListingUrl } from "../lib/listing-url";

test("all browse filters and pagination survive a share URL round trip", () => {
  const input = new URLSearchParams({ search: "شقة واسعة", listingType: "rent", status: "rented", residencyType: "family", sortBy: "price", sortDir: "asc", propertyType: "villa", rooms: "3", minPrice: "1000", maxPrice: "5000", location: "الرياض", page: "3" });
  const state = readListingUrl(input, "apartment");
  const result = readListingUrl(new URLSearchParams(writeListingUrl(new URLSearchParams(), state.filters, state.page, "apartment")), "apartment");
  assert.deepEqual(result, state);
});
test("land URLs ignore room, suitability, subtype and rent criteria", () => {
  const state = readListingUrl(new URLSearchParams('category=apartment&listingType=rent&rooms=3&residencyType=family&propertyType=villa&minPrice=500'), "land");
  assert.equal(state.filters.category, "land");
  for (const key of ["listingType", "rooms", "residencyType", "propertyType"] as const) assert.equal(state.filters[key], "");
  assert.equal(state.filters.minPrice, "500");
});
test("reset clears managed criteria, keeps unrelated parameters and preserves all-status selection", () => {
  const initial = new URLSearchParams('utm_source=whatsapp&listingType=rent&page=4&rooms=3');
  const defaults = readListingUrl(new URLSearchParams(), "build");
  assert.equal(writeListingUrl(initial, defaults.filters, 1, "build"), "utm_source=whatsapp");
  const query = writeListingUrl(new URLSearchParams(), { ...defaults.filters, status: "" }, 1, "build");
  assert.equal(query, "status=all");
  assert.equal(readListingUrl(new URLSearchParams(query), "build").filters.status, "");
});
test("invalid URL values use safe defaults and fixed routes override categories", () => {
  const state = readListingUrl(new URLSearchParams('category=land&page=-3&status=invalid&sortBy=bad&minPrice=-1&listingType=invalid'), "build");
  assert.equal(state.page, 1); assert.equal(state.filters.category, "build");
  assert.equal(state.filters.status, "available"); assert.equal(state.filters.sortBy, "createdAt"); assert.equal(state.filters.minPrice, "");
});
