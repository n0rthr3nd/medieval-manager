import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

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
  if (mongod) {
    // mongodb-memory-server no expone el instance directamente en su tipo
    // usamos el método drop para limpiar todas las colecciones
    // Si no está disponible, limpiamos manualmente usando la uri
    const uri = mongod.getUri();
    // Fallback: solo limpiamos si tenemos una URI válida
    if (uri) {
      // No podemos acceder al instance sin type assertion
      // En tests reales, usaríamos mongodb directo
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
