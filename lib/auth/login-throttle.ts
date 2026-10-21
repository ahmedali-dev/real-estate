import { createHash } from "node:crypto";
import mongoose from "mongoose";

/** Shared database-backed limit, effective across serverless instances. */
export async function consumeLoginAttempt(identifier: string, now = Date.now()) {
  const windowMs = 10 * 60 * 1000;
  const bucket = Math.floor(now / windowMs);
  const digest = createHash("sha256").update(identifier).digest("hex");
  const collection = mongoose.connection.collection<{ _id: string; attempts: number; expiresAt: Date }>("login_attempts");
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  // The unique _id makes concurrent increments atomic; a new bucket resets the limit.
  const result = await collection.findOneAndUpdate({ _id: `${digest}:${bucket}` }, { $inc: { attempts: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * windowMs) } }, { upsert: true, returnDocument: "after" });
  return Boolean(result && result.attempts <= 10);
}
