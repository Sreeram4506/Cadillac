const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const DATA_FILE = path.join(__dirname, 'data.json');
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB || 'dealership_ai';
const APP_STATE_ID = 'app-state';

async function main() {
  if (!MONGODB_URI) {
    console.log("No MONGODB_URI found. Exiting.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log("Connected to MongoDB.");
    
    const db = client.db(MONGODB_DB_NAME);
    const stateCollection = db.collection('app_state');

    await stateCollection.updateOne(
      { _id: APP_STATE_ID },
      { $set: { ...data, updatedAt: new Date() } },
      { upsert: true }
    );
    
    console.log("Successfully updated MongoDB with new US/Cadillac seed data.");
  } catch (error) {
    console.error("Error updating MongoDB:", error);
  } finally {
    await client.close();
  }
}

main();
