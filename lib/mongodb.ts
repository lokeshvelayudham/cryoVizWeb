// lib/mongodb.ts
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient | undefined;
const clientPromise: Promise<MongoClient> = (global._mongoClientPromise ?? (() => {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
  return global._mongoClientPromise;
})()) as Promise<MongoClient>;

declare global {
  // allow global to have _mongoClientPromise
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export default clientPromise;