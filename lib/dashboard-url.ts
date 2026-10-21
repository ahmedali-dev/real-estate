import type { FilterState } from "@/components/properties/FilterBar";
import { dashboardFilterGroups, dashboardFilterKeys } from "./dashboard-filters";
import { readListingUrl, writeListingUrl } from "./listing-url";
import type { Category } from "@/types/property";
const extra = ["visibility", "hasPrice", "hasImages", "hasTikTok", "hasMap", ...dashboardFilterKeys] as const;
export function readDashboardUrl(params: URLSearchParams, buildOnly = false) {
  const fixed: Category | undefined = buildOnly ? "build" : undefined;
  const state = readListingUrl(params, fixed);
  if (!params.has("status")) state.filters.status = "";
  for (const key of extra) { const value = params.get(key); if (value) state.filters[key] = value.slice(0, 200); }
  for (const group of dashboardFilterGroups) {
    if (("nonLand" in group && group.nonLand && state.filters.category === "land") || ("building" in group && group.building && state.filters.category && state.filters.category !== "build")) {
      for (const field of group.fields) delete state.filters[field.key];
    }
  }
  const size = Number(params.get("pageSize"));
  return { ...state, pageSize: [10, 20, 50, 100].includes(size) ? size : 20 };
}
export function writeDashboardUrl(current: URLSearchParams, filters: FilterState, page: number, pageSize: number, buildOnly = false) {
  const params = new URLSearchParams(writeListingUrl(current, filters, page, buildOnly ? "build" : undefined));
  for (const key of extra) params.delete(key);
  for (const key of extra) if (filters[key]) params.set(key, filters[key]!);
  // Dashboard defaults to all statuses, whereas the public browser defaults to available.
  params.delete("status"); if (filters.status) params.set("status", filters.status);
  params.delete("pageSize"); if (pageSize !== 20) params.set("pageSize", String(pageSize));
  return params.toString();
}
