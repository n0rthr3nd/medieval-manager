import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = 'test-secret-key-for-testing';

export interface TestUser {
  _id: string;
  username: string;
  nombre: string;
  role: 'user' | 'admin';
  password: string;
}

export const createTestUser = (overrides?: Partial<TestUser>): TestUser => {
  return {
    _id: '60d5ec4e8f8b8d1a2c3b4d5e',
    username: 'testuser',
    nombre: 'TEST USER',
    role: 'user',
    password: 'password123',
    ...overrides,
  };
};

export const createAdminUser = (overrides?: Partial<TestUser>): TestUser => {
  return {
    _id: '60d5ec4e8f8b8d1a2c3b4d5f',
    username: 'admin',
    nombre: 'ADMIN USER',
    role: 'admin',
    password: 'admin123',
    ...overrides,
  };
};

export const createToken = (user: Partial<TestUser>): string => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      nombre: user.nombre,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const authHeader = (token: string): { Authorization: string } => {
  return { Authorization: `Bearer ${token}` };
};

export const authenticateRequest = (
  app: Express,
  method: string,
  path: string,
  user: Partial<TestUser> = {},
  body?: unknown
) => {
  const token = createToken(user);
  const headers = authHeader(token);

  switch (method.toUpperCase()) {
    case 'GET':
      return request(app).get(path).set(headers);
    case 'POST':
      return request(app).post(path).set(headers).send(body as any);
    case 'PUT':
      return request(app).put(path).set(headers).send(body as any);
    case 'DELETE':
      return request(app).delete(path).set(headers);
    case 'PATCH':
      return request(app).patch(path).set(headers).send(body as any);
    default:
      throw new Error(`Method ${method} not supported`);
  }
};
