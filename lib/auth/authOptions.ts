import { consumeLoginAttempt } from "./login-throttle";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { normalizePhone } from "@/lib/auth/phone";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import type { UserRole } from "@/types/user";

export const authOptions: AuthOptions = {
  // Explicit rather than relying on NextAuth's automatic detection of
  // process.env.NEXTAUTH_SECRET — if this is undefined in production,
  // NextAuth throws its own clear "[next-auth][error][NO_SECRET]" message
  // in the server logs, instead of a vaguer failure downstream.
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        identifier: { label: "Email or phone number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = (credentials?.identifier || credentials?.email || "").trim();
        if (!identifier || !credentials?.password) return null;
        const phone = normalizePhone(identifier);
        if (!identifier.includes("@") && !phone) return null;

        try {
          await connectToDatabase();
        } catch (err) {
          // An unhandled throw here is exactly what surfaces to the user
          // as NextAuth's opaque "Configuration" error page. Logging
          // clearly here means the *real* cause (missing MONGODB_URI, or
          // MongoDB Atlas Network Access not allowing this server's IP)
          // shows up in the server/function logs instead of staying a
          // mystery.
          console.error(
            "[auth] Could not connect to MongoDB during sign-in. Check that " +
              "MONGODB_URI is set correctly for this environment, and that " +
              "MongoDB Atlas → Network Access allows connections from this " +
              "server (e.g. 0.0.0.0/0 for serverless hosting like Vercel).",
            err
          );
          throw new Error("Could not reach the database. Please try again shortly.");
        }

        if (!await consumeLoginAttempt(identifier.includes("@") ? identifier.toLowerCase() : phone!)) return null;
        const user = await User.findOne(identifier.includes("@") ? { email: identifier.toLowerCase() } : { phone });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      // Recheck on every server session read: logout-by-deactivation and role
      // changes take effect without waiting for the signed JWT to expire.
      try {
        await connectToDatabase();
        const current = token.id ? await User.findById(token.id).select("name email role active") : null;
        if (!current?.active || !["admin", "real_estate_officer", "sales_officer", "project_manager"].includes(current.role)) {
          session.user = undefined as never;
          return session;
        }
        session.user = { id: current._id.toString(), role: current.role, name: current.name, email: current.email };
      } catch {
        // A database outage must never grant stale privileges.
        session.user = undefined as never;
      }
      return session;
    },
  },
};
