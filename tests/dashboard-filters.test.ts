import test from "node:test";
import assert from "node:assert/strict";
import { dashboardFilterConditions, dashboardFilterKeys } from "../lib/dashboard-filters";
import { buildQuery } from "../lib/api-client";

test("dashboard query preserves every supported filter and pagination", () => {
  const values = Object.fromEntries(dashboardFilterKeys.map(key => [key, "example"]));
  const query = new URLSearchParams(buildQuery({ ...values, page: 3, limit: 20 }));
  for (const key of dashboardFilterKeys) assert.equal(query.get(key), "example");
  assert.equal(query.get("page"), "3");
});
test("building detail and tenant conditions apply to the same unit", () => {
  const conditions = dashboardFilterConditions(new URLSearchParams({ rooms: "2", bathrooms: "1", tenantName: "A.*", unitName: "12", unitRented: "yes" }), "build");
  const building = conditions.find(c => c.category === "build")!;
  const match = (building.units as { $elemMatch: { $and: unknown[] } }).$elemMatch.$and;
  assert.equal(match.length, 5);
  assert.match(JSON.stringify(match), /A\\\\\.\\\\\*/);
  assert.match(JSON.stringify(match), /"rooms":\{"\$gte":2\}/);
});
test("land ignores room, tenant, rental and unit filters", () => {
  assert.deepEqual(dashboardFilterConditions(new URLSearchParams({ rooms: "2", hasKitchen: "yes", tenantName: "Private", unitName: "2", rentalPeriod: "yearly" }), "land"), []);
});
test("date range includes the whole final UTC day and rejects invalid ranges", () => {
  const conditions = dashboardFilterConditions(new URLSearchParams({ createdFrom: "2026-10-01", createdTo: "2026-10-21" }), null);
  assert.deepEqual(conditions, [{ createdAt: { $gte: new Date("2026-10-01T00:00:00Z"), $lt: new Date("2026-10-22T00:00:00Z") } }]);
  for (const params of ["createdFrom=2026-02-30", "rooms=5&maxRooms=2", "minUnits=-1", "broughtByUserId=invalid"]) assert.throws(() => dashboardFilterConditions(new URLSearchParams(params), null), RangeError);
});
test("standalone detail filters use nested fields and retain tenant paths", () => {
  const conditions = dashboardFilterConditions(new URLSearchParams({ hasKitchen: "no", tenantPhone: "0500", hasTenant: "no" }), "apartment");
  const text = JSON.stringify(conditions);
  assert.match(text, /details.hasKitchen/);
  assert.match(text, /tenant.phone/);
  assert.doesNotMatch(text, /details.tenant/);
  assert.match(text, /\$nor/);
});
