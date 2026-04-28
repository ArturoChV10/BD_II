const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB_NAME || process.env.DB_NAME || "restaurant_db";

let client = null;
let db = null;

const connectMongo = async () => {
  if (db) {
    return db;
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  return db;
};

const getCollection = async (collectionName) => {
  const database = await connectMongo();
  return database.collection(collectionName);
};

const closeMongo = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
};

module.exports = {
  connectMongo,
  getCollection,
  closeMongo
};
