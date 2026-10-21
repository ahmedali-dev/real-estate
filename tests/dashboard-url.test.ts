import test from "node:test";
import assert from "node:assert/strict";
import { readDashboardUrl, writeDashboardUrl } from "../lib/dashboard-url";

test("dashboard advanced filters, pagination and page size round trip", () => {
  const params = new URLSearchParams('ownerName=Ali&tenantId=123&hasImages=no&visibility=private&createdFrom=2026-10-01&listingType=rent&status=available&page=3&pageSize=50');
  const state = readDashboardUrl(params);
  const encoded = writeDashboardUrl(new URLSearchParams(), state.filters, state.page, state.pageSize);
  assert.deepEqual(readDashboardUrl(new URLSearchParams(encoded)), state);
});
test("dashboard reset removes all known filters but preserves unrelated query parameters", () => {
  const current = new URLSearchParams('ownerName=Ali&maxRooms=5&visibility=private&page=3&pageSize=50&utm_source=office');
  const defaults = readDashboardUrl(new URLSearchParams());
  assert.equal(defaults.filters.status, "");
  assert.equal(writeDashboardUrl(current, defaults.filters, 1, 20), 'utm_source=office');
});
test("project manager scope and incompatible land filters are enforced on URL restore", () => {
  const params = new URLSearchParams('category=land&rooms=4&tenantName=Ali&minUnits=5&pageSize=999&page=-3');
  const land = readDashboardUrl(params);
  assert.equal(land.filters.rooms, ""); assert.equal(land.filters.tenantName, undefined); assert.equal(land.filters.minUnits, undefined);
  assert.equal(land.page, 1); assert.equal(land.pageSize, 20);
  const manager = readDashboardUrl(params, true);
  assert.equal(manager.filters.category, 'build'); assert.equal(manager.filters.minUnits, '5');
});
