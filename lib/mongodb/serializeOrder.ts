import type { OrderHydrated } from "@/models/Order";
import type { OrderDTO } from "@/types/order";

export function serializeOrder(doc: OrderHydrated): OrderDTO {
  const obj = doc.toObject({ getters: true });
  return {
    _id: obj._id.toString(),
    customerName: obj.customerName,
    customerPhone: obj.customerPhone,
    requestedCategory: obj.requestedCategory,
    requestedListingType: obj.requestedListingType,
    notes: obj.notes || undefined,
    status: obj.status,
    loggedBy: obj.loggedBy ? { userId: obj.loggedBy.userId, name: obj.loggedBy.name } : undefined,
    createdAt: new Date(obj.createdAt).toISOString(),
    updatedAt: new Date(obj.updatedAt).toISOString(),
  };
}
