import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
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
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

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

        const user = await User.findOne({ email: credentials.email.toLowerCase().trim() });
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
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
};
