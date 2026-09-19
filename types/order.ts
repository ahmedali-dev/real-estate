export type RequestedCategory = "apartment" | "build" | "land";
export type RequestedListingType = "sale" | "rent";
export type OrderStatus = "pending" | "contacted" | "fulfilled" | "cancelled";

export interface OrderDTO {
  _id: string;
  customerName: string;
  customerPhone: string;
  requestedCategory: RequestedCategory;
  requestedListingType?: RequestedListingType;
  notes?: string;
  status: OrderStatus;
  loggedBy?: {
    userId: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  data: OrderDTO[];
  total: number;
  stats: {
    total: number;
    pending: number;
    contacted: number;
    fulfilled: number;
    cancelled: number;
  };
}

export const ORDER_STATUSES: OrderStatus[] = ["pending", "contacted", "fulfilled", "cancelled"];
