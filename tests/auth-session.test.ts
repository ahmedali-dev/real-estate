import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { authOptions } from "../lib/auth/authOptions";
import { User } from "../models/User";

test("session checks revoke deactivated accounts, refresh roles and fail closed", async () => {
  const original = User.findById;
  const cache = global._mongooseCache!;
  const connection = cache.conn;
  cache.conn = mongoose;
  const callback = authOptions.callbacks!.session!;
  async function session() {
    return callback({ session: { user: { id: "old", role: "admin" }, expires: "2099-01-01" }, token: { id: "507f1f77bcf86cd799439011", role: "admin" } } as never);
  }
  try {
    User.findById = (() => ({ select: async () => ({ active: false }) })) as never;
    assert.equal((await session()).user, undefined);
    User.findById = (() => ({ select: async () => ({ active: true, role: "sales_officer", name: "Staff", email: "staff@example.com", _id: "507f1f77bcf86cd799439011" }) })) as never;
    assert.equal(((await session()).user as { role: string }).role, "sales_officer");
    User.findById = (() => { throw Error("Database unavailable"); }) as never;
    assert.equal((await session()).user, undefined);
  } finally { User.findById = original; cache.conn = connection; }
});
