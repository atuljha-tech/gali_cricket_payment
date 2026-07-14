import mongoose from 'mongoose'

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Use a global variable so the value is preserved across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache
}

let cached: MongooseCache = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect(): Promise<typeof mongoose> {
  // Validate at call time (runtime), not at module evaluation (build time)
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
  }

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands:    false,
      maxPoolSize:       10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:   45000,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}

export default dbConnect
