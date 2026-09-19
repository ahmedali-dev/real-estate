export type UserRole = "admin" | "real_estate_officer" | "sales_officer" | "project_manager";

export interface UserDTO {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
