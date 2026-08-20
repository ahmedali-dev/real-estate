import type { PropertyDTO, PropertyListResponse } from "@/types/property";
import type { FilterState } from "@/components/properties/FilterBar";

export class ApiClientError extends Error {
  fieldErrors?: Record<string, string>;
  status: number;
  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiClientError(
      body.error ?? "Request failed.",
      res.status,
      body.fieldErrors
    );
  }
  return body as T;
}

export function buildQuery(filters: Partial<FilterState> & { page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.listingType) params.set("listingType", filters.listingType);
  if (filters.status) params.set("status", filters.status);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortDir) params.set("sortDir", filters.sortDir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return params.toString();
}

export async function fetchProperties(
  filters: Partial<FilterState> & { page?: number; limit?: number } = {}
): Promise<PropertyListResponse> {
  const qs = buildQuery(filters);
  const res = await fetch(`/api/properties${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  return handle<PropertyListResponse>(res);
}

export async function fetchProperty(id: string): Promise<{ data: PropertyDTO }> {
  const res = await fetch(`/api/properties/${id}`, { cache: "no-store" });
  return handle<{ data: PropertyDTO }>(res);
}

export async function createProperty(payload: unknown): Promise<{ data: PropertyDTO }> {
  const res = await fetch(`/api/properties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ data: PropertyDTO }>(res);
}

export async function updateProperty(id: string, payload: unknown): Promise<{ data: PropertyDTO }> {
  const res = await fetch(`/api/properties/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ data: PropertyDTO }>(res);
}

export interface TikTokCoverResult {
  thumbnailUrl: string;
  title?: string;
  authorName?: string;
}

export async function fetchTikTokCover(url: string): Promise<{ data: TikTokCoverResult }> {
  const res = await fetch(`/api/tiktok/oembed?url=${encodeURIComponent(url)}`, {
    cache: "no-store",
  });
  return handle<{ data: TikTokCoverResult }>(res);
}

export async function deleteProperty(id: string): Promise<void> {
  const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
  await handle(res);
}
