import { setupTestDB, clearTestDB } from './setup';

// Configurar entorno de test
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.NODE_ENV = 'test';

// Hooks de Jest
beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await clearTestDB();
});
