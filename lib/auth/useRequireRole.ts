"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { UserRole } from "@/types/user";

/**
 * Redirects to `redirectTo` once the session has loaded if the signed-in
 * user's role isn't in `allowedRoles`. Renders nothing meaningful while the
 * session is loading or a redirect is pending — pages using this should
 * treat a null/false return as "don't render yet".
 *
 * This is a UX convenience only; the actual security boundary is enforced
 * server-side in the API routes (see lib/auth/requireSession.ts).
 */
export function useRequireRole(allowedRoles: UserRole[], redirectTo: string) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const ready = status === "authenticated" && session?.user
    ? allowedRoles.includes(session.user.role)
    : status === "loading";

  useEffect(() => {
    if (status === "authenticated" && session?.user && !allowedRoles.includes(session.user.role)) {
      router.replace(redirectTo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, redirectTo]);

  return { ready, status, role: session?.user.role };
}
