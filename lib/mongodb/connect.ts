import mongoose from "mongoose";

/**
 * Next.js reloads modules on every request in development, which would
 * otherwise create a new database connection each time. We cache the
 * connection (and the in-flight connection promise) on the global object
 * so it survives hot reloads and is reused across serverless invocations.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global._mongooseCache) {
  global._mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  // Checked here (at call time), not at module load time — importing this
  // file must never crash on its own. A missing env var should surface as
  // a normal, catchable error to whatever route/callback tried to use the
  // database, not as an uncaught exception the moment the module loads.
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Add it to your .env.local file locally, " +
        "or your hosting provider's environment variables in production."
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
