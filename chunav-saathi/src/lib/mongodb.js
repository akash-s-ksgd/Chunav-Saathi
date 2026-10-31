import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chunav-saathi";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

function getClientPromise() {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(MONGODB_URI);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    const client = new MongoClient(MONGODB_URI);
    clientPromise = client.connect();
  }
  return clientPromise;
}

let clientPromise;

export async function getDb() {
  const client = await getClientPromise();
  return client.db();
}

export async function closeDb() {
  const promise = process.env.NODE_ENV === "development"
    ? global._mongoClientPromise
    : clientPromise;
  if (!promise) return;

  const client = await promise;
  await client.close();
  if (process.env.NODE_ENV === "development") {
    delete global._mongoClientPromise;
  } else {
    clientPromise = undefined;
  }
}

export const database = { getDb };
