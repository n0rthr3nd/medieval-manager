import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

/**
 * Inicializa la base de datos de test
 */
export const beforeAllTest = async () => {
  if (!mongod) {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    console.log(`[Test DB] Connected at: ${uri}`);
  }
};

/**
 * Limpia las colecciones y deja la DB lista para el siguiente test
 */
export const beforeEachTest = async () => {
  if (mongod && mongod.instance) {
    const { db } = mongod.instance;
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.dropCollection(collection.name);
    }
  }
};

/**
 * Cierra la conexión a la base de datos después de los tests
 */
export const afterAllTest = async () => {
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
};

export default {
  beforeAll: beforeAllTest,
  beforeEach: beforeEachTest,
  afterAll: afterAllTest,
};
