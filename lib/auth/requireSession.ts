import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/authOptions";
import type { UserRole } from "@/types/user";

/**
 * Which roles can manage listings vs. orders. Real Estate Officers and
 * Project Managers work with listings (Project Managers scoped to "build"
 * listings only — checked separately, since that depends on the specific
 * listing's category, not just the role). Sales Officers work with orders
 * only. Admins can do everything, plus deletes and user management.
 */
const LISTINGS_ROLES: UserRole[] = ["admin", "real_estate_officer", "project_manager"];
const ORDERS_ROLES: UserRole[] = ["admin", "sales_officer"];

/**
 * Returns the current session, or null. Use this in API routes that should
 * only be callable by any signed-in user, regardless of role.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, response: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }
  return { session, response: null };
}

/**
 * Same as requireSession, but also requires the "admin" role. Use for
 * destructive actions (delete) and user management.
 */
export async function requireAdmin() {
  const { session, response } = await requireSession();
  if (response) return { session, response };
  if (session!.user.role !== "admin") {
    return { session: null, response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { session, response: null };
}

/**
 * Requires a role allowed to manage listings (admin, real_estate_officer,
 * or project_manager). Project Manager's "build only" restriction is
 * enforced separately by the caller, since it depends on the listing's
 * category, not just the role.
 */
export async function requireListingsAccess() {
  const { session, response } = await requireSession();
  if (response) return { session, response };
  if (!LISTINGS_ROLES.includes(session!.user.role)) {
    return {
      session: null,
      response: NextResponse.json({ error: "You don't have access to manage listings." }, { status: 403 }),
    };
  }
  return { session, response: null };
}

/** True if this role can only manage "build" listings (not apartment/land). */
export function isBuildOnlyRole(role: UserRole) {
  return role === "project_manager";
}

/**
 * Requires a role allowed to manage orders (admin or sales_officer).
 */
export async function requireOrdersAccess() {
  const { session, response } = await requireSession();
  if (response) return { session, response };
  if (!ORDERS_ROLES.includes(session!.user.role)) {
    return {
      session: null,
      response: NextResponse.json({ error: "You don't have access to manage orders." }, { status: 403 }),
    };
  }
  return { session, response: null };
}
