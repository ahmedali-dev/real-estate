/**
 * Creates (or updates) an admin account. Run this once to bootstrap access
 * to the dashboard, since there is no public sign-up form by design.
 *
 * Usage:
 *   npm run create-admin -- --name "Jane Doe" --email jane@example.com --password "at-least-8-chars"
 *
 * Running it again with the same email updates that user's name/password
 * and ensures their role is "admin" and they're active.
 */
import { config } from "dotenv";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
config({ path: fs.existsSync(envLocalPath) ? envLocalPath : path.resolve(process.cwd(), ".env") });

const MONGODB_URI = process.env.MONGODB_URI;

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI. Add it to .env.local first.");
    process.exit(1);
  }

  const name = readArg("--name");
  const email = readArg("--email")?.toLowerCase().trim();
  const password = readArg("--password");

  if (!name || !email || !password) {
    console.error(
      'Usage: npm run create-admin -- --name "Jane Doe" --email jane@example.com --password "at-least-8-chars"'
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { name, email, passwordHash, role: "admin", active: true } },
    { upsert: true, new: true }
  );

  console.log(`Admin ready: ${user.email} (role: ${user.role})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
