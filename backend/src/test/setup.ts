import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer | null = null;
let isSetupComplete = false;

export const setupTestDB = async () => {
  if (!mongod) {
    console.log('Starting MongoDB Memory Server...');
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();
    process.env.MONGODB_URI = mongoUri;
    console.log('MongoDB Memory Server started at:', mongoUri);

    // Connect Mongoose to the in-memory database
    await mongoose.connect(mongoUri);
    isSetupComplete = true;
    console.log('Mongoose connected to test database');
  }
};

export const clearTestDB = async () => {
  if (mongod) {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    await mongod.stop();
    mongod = null;
    isSetupComplete = false;
  }
};

export const getTestDBUri = () => {
  if (!mongod) {
    throw new Error('Database not initialized. Call setupTestDB() first.');
  }
  return mongod.getUri();
};

export const ensureDBConnected = async () => {
  if (!isSetupComplete) {
    await setupTestDB();
  }
};
