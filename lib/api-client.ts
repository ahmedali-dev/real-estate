import type { PropertyDTO, PropertyListResponse } from "@/types/property";
import type { FilterState } from "@/components/properties/FilterBar";
import type { OrderDTO, OrderListResponse, RequestedCategory, OrderStatus } from "@/types/order";
import type { UserDTO } from "@/types/user";
import type { MeterOption, ElectricalReadingDTO, ElectricalStats, ElectricalAlert } from "@/types/electrical";

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
  if (filters.residencyType) params.set("residencyType", filters.residencyType);
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

export interface OrderFilters {
  search?: string;
  status?: OrderStatus | "";
  category?: RequestedCategory | "";
  page?: number;
  limit?: number;
}

function buildOrderQuery(filters: OrderFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return params.toString();
}

export async function fetchOrders(filters: OrderFilters = {}): Promise<OrderListResponse> {
  const qs = buildOrderQuery(filters);
  const res = await fetch(`/api/orders${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  return handle<OrderListResponse>(res);
}

export async function fetchOrder(id: string): Promise<{ data: OrderDTO }> {
  const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
  return handle<{ data: OrderDTO }>(res);
}

export async function uploadImage(file: File): Promise<{ data: { url: string } }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/uploads`, { method: "POST", body: formData });
  return handle<{ data: { url: string } }>(res);
}

export async function createOrder(payload: unknown): Promise<{ data: OrderDTO }> {
  const res = await fetch(`/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ data: OrderDTO }>(res);
}

export async function updateOrder(id: string, payload: unknown): Promise<{ data: OrderDTO }> {
  const res = await fetch(`/api/orders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ data: OrderDTO }>(res);
}

export async function deleteOrder(id: string): Promise<void> {
  const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
  await handle(res);
}

export async function fetchUsers(): Promise<{ data: UserDTO[] }> {
  const res = await fetch(`/api/users`, { cache: "no-store" });
  return handle<{ data: UserDTO[] }>(res);
}

export async function createUser(payload: unknown): Promise<{ data: UserDTO }> {
  const res = await fetch(`/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ data: UserDTO }>(res);
}

export async function updateUser(id: string, payload: unknown): Promise<{ data: UserDTO }> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ data: UserDTO }>(res);
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  await handle(res);
}

export async function fetchMeters(): Promise<{ data: MeterOption[] }> {
  const res = await fetch(`/api/electrical-readings/meters`, { cache: "no-store" });
  return handle<{ data: MeterOption[] }>(res);
}

export async function fetchElectricalReadings(
  electricityNumber: string,
  limit = 50
): Promise<{ data: ElectricalReadingDTO[]; stats: ElectricalStats; alerts: ElectricalAlert[] }> {
  const params = new URLSearchParams({ electricityNumber, limit: String(limit) });
  const res = await fetch(`/api/electrical-readings?${params.toString()}`, { cache: "no-store" });
  return handle<{ data: ElectricalReadingDTO[]; stats: ElectricalStats; alerts: ElectricalAlert[] }>(res);
}

export async function createElectricalReading(payload: unknown): Promise<{ data: ElectricalReadingDTO }> {
  const res = await fetch(`/api/electrical-readings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ data: ElectricalReadingDTO }>(res);
}
