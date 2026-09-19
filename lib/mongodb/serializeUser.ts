import type { UserHydrated } from "@/models/User";
import type { UserDTO } from "@/types/user";

export function serializeUser(doc: UserHydrated): UserDTO {
  const obj = doc.toObject({ getters: true });
  return {
    _id: obj._id.toString(),
    name: obj.name,
    email: obj.email,
    role: obj.role,
    active: obj.active,
    createdAt: new Date(obj.createdAt).toISOString(),
    updatedAt: new Date(obj.updatedAt).toISOString(),
  };
}
