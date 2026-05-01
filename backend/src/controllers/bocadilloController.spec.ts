import { Request, Response } from 'express';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import Bocadillo from '../models/Bocadillo';
import Settings from '../models/Settings';
import User, { UserRole } from '../models/User';
import { ensureDBConnected } from '../test/setup';
import { getWeekNumber } from '../utils/dateUtils';
import {
  createBocadillo,
  getBocadillosSemanaActual,
  updateBocadillo,
  deleteBocadillo,
  updatePrecio,
  markAsPagado,
} from './bocadilloController';

beforeAll(async () => {
  await ensureDBConnected();
});

const createMockRequest = (overrides?: Partial<Request>): any => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    ...overrides,
  };
};

const createMockResponse = (): any => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
};

describe('bocadilloController', () => {
  beforeEach(async () => {
    await Bocadillo.deleteMany({});
    await Settings.deleteMany({});
    await User.deleteMany({});
  });

  describe('createBocadillo', () => {
    it('should create a bocadillo successfully', async () => {
      const user = await User.create({
        username: 'testuser',
        password: 'password123',
        nombre: 'Test User',
        role: UserRole.USER,
      });

      const req = createMockRequest({
        user: {
          userId: user._id.toString(),
          username: user.username,
          nombre: user.nombre,
          role: user.role,
        },
        body: {
          nombre: 'Test Bocadillo',
          tamano: 'normal',
          tipoPan: 'normal',
          ingredientes: ['jamon', 'queso'],
        },
      } as any);
      const res = createMockResponse();

      await createBocadillo(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const response = res.json.mock.calls[0][0] as any;
      expect(response.success).toBe(true);
      expect(response.data.nombre).toBe('TEST USER');
      expect(response.data.ingredientes).toEqual(['jamon', 'queso']);
    });

    it('should reject when orders are closed for non-admin users', async () => {
      await Settings.create({
        ordersClosed: true,
        closedMessage: 'Los pedidos estn cerrados',
      });

      const user = await User.create({
        username: 'testuser',
        password: 'password123',
        nombre: 'Test User',
        role: UserRole.USER,
      });

      const req = createMockRequest({
        user: {
          userId: user._id.toString(),
          username: user.username,
          nombre: user.nombre,
          role: user.role,
        },
        body: {
          tamano: 'normal',
          tipoPan: 'normal',
          ingredientes: ['jamon', 'queso'],
        },
      } as any);
      const res = createMockResponse();

      await createBocadillo(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      const response = res.json.mock.calls[0][0] as any;
      expect(response.success).toBe(false);
      expect(response.error).toBe('Los pedidos estn cerrados');
    });

    it('should allow admin to create orders when closed', async () => {
      await Settings.create({
        ordersClosed: true,
        closedMessage: 'Los pedidos estn cerrados',
      });

      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        nombre: 'Admin User',
        role: UserRole.ADMIN,
      });

      const req = createMockRequest({
        user: {
          userId: adminUser._id.toString(),
          username: adminUser.username,
          nombre: adminUser.nombre,
          role: adminUser.role,
        },
        body: {
          nombre: 'Test Bocadillo',
          tamano: 'normal',
          tipoPan: 'normal',
          ingredientes: ['jamon', 'queso'],
        },
      } as any);
      const res = createMockResponse();

      await createBocadillo(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should reject with invalid data', async () => {
      const user = await User.create({
        username: 'testuser',
        password: 'password123',
        nombre: 'Test User',
        role: UserRole.USER,
      });

      const req = createMockRequest({
        user: {
          userId: user._id.toString(),
          username: user.username,
          nombre: user.nombre,
          role: user.role,
        },
        body: {
          tamano: 'invalid',
          tipoPan: 'normal',
          ingredientes: [],
        },
      } as any);
      const res = createMockResponse();

      await createBocadillo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = res.json.mock.calls[0][0] as any;
      expect(response.success).toBe(false);
    });
  });

  describe('getBocadillosSemanaActual', () => {
    it('should return bocadillos for current week', async () => {
      const user = await User.create({
        username: 'testuser',
        password: 'password123',
        nombre: 'Test User',
        role: UserRole.USER,
      });

      const { week, year } = getWeekNumber(new Date());
      await Bocadillo.create({
        userId: user._id,
        nombre: 'Test Bocadillo',
        tamano: 'normal',
        tipoPan: 'normal',
        ingredientes: ['jamon', 'queso'],
        semana: week,
        ano: year,
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await getBocadillosSemanaActual(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const response = res.json.mock.calls[0][0] as any;
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.semana).toBe(week);
      expect(response.ano).toBe(year);
    });
  });

  describe('updateBocadillo', () => {
    it('should update bocadillo successfully', async () => {
      const user = await User.create({
        username: 'testuser',
        password: 'password123',
        nombre: 'Test User',
        role: UserRole.USER,
      });

      const { week, year } = getWeekNumber(new Date());
      const bocadillo = await Bocadillo.create({
        userId: user._id,
        nombre: 'Test Bocadillo',
        tamano: 'normal',
        tipoPan: 'normal',
        ingredientes: ['jamon', 'queso'],
        semana: week,
        ano: year,
      });

      const req = createMockRequest({
        user: {
          userId: user._id.toString(),
          username: user.username,
          nombre: user.nombre,
          role: user.role,
        },
        params: { id: bocadillo._id.toString() },
        body: {
          nombre: 'Test Bocadillo',
          tamano: 'grande',
          tipoPan: 'normal',
          ingredientes: ['jamon', 'queso', 'lechuga'],
        },
      } as any);
      const res = createMockResponse();

      await updateBocadillo(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const response = res.json.mock.calls[0][0] as any;
      expect(response.success).toBe(true);
      expect(response.data.tamano).toBe('grande');
      expect(response.data.ingredientes).toEqual(['jamon', 'queso', 'lechuga']);
    });

    it('should reject when bocadillo not found', async () => {
      const user = await User.create({
        username: 'testuser',
        password: 'password123',
        nombre: 'Test User',
        role: UserRole.USER,
      });

      const req = createMockRequest({
        user: {
          userId: user._id.toString(),
          username: user.username,
          nombre: user.nombre,
          role: user.role,
        },
        params: { id: '60d5ec4e8f8b8d1a2c3b4d5e' },
        body: {
          tamano: 'grande',
        },
      } as any);
      const res = createMockResponse();

      await updateBocadillo(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should reject when not owner and not admin', async () => {
      const user1 = await User.create({
        username: 'user1',
        password: 'password123',
        nombre: 'User One',
        role: UserRole.USER,
      });

      const user2 = await User.create({
        username: 'user2',
        password: 'password123',
        nombre: 'User Two',
        role: UserRole.USER,
      });

      const { week, year } = getWeekNumber(new Date());
      const bocadillo = await Bocadillo.create({
        userId: user1._id,
        nombre: 'Test Bocadillo',
        tamano: 'normal',
        tipoPan: 'normal',
        ingredientes: ['jamon', 'queso'],
        semana: week,
        ano: year,
      });

      const req = createMockRequest({
        user: {
          userId: user2._id.toString(),
          username: user2.username,
          nombre: user2.nombre,
          role: user2.role,
        },
        params: { id: bocadillo._id.toString() },
        body: {
          tamano: 'grande',
        },
      } as any);
      const res = createMockResponse();

      await updateBocadillo(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      const response = res.json.mock.calls[0][0] as any;
      expect(response.error).toBe('No tienes permiso para editar este bocadillo');
    });
  });

  describe('deleteBocadillo', () => {
    it('should delete bocadillo successfully', async () => {
      const user = await User.create({
        username: 'testuser',
        password: 'password123',
        nombre: 'Test User',
        role: UserRole.USER,
      });

      const { week, year } = getWeekNumber(new Date());
      const bocadillo = await Bocadillo.create({
        userId: user._id,
        nombre: 'Test Bocadillo',
        tamano: 'normal',
        tipoPan: 'normal',
        ingredientes: ['jamon', 'queso'],
        semana: week,
        ano: year,
      });

      const req = createMockRequest({
        user: {
          userId: user._id.toString(),
          username: user.username,
          nombre: user.nombre,
          role: user.role,
        },
        params: { id: bocadillo._id.toString() },
      } as any);
      const res = createMockResponse();

      await deleteBocadillo(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const response = res.json.mock.calls[0][0] as any;
      expect(response.success).toBe(true);

      const deleted = await Bocadillo.findById(bocadillo._id);
      expect(deleted).toBeNull();
    });
  });

  describe('updatePrecio', () => {
    it('should update price successfully for admin', async () => {
      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        nombre: 'Admin User',
        role: UserRole.ADMIN,
      });

      const { week, year } = getWeekNumber(new Date());
      const bocadillo = await Bocadillo.create({
        nombre: 'Test Bocadillo',
        tamano: 'normal',
        tipoPan: 'normal',
        ingredientes: ['jamon', 'queso'],
        semana: week,
        ano: year,
      });

      const req = createMockRequest({
        user: {
          userId: adminUser._id.toString(),
          username: adminUser.username,
          nombre: adminUser.nombre,
          role: adminUser.role,
        },
        params: { id: bocadillo._id.toString() },
        body: {
          precio: 5.50,
        },
      } as any);
      const res = createMockResponse();

      await updatePrecio(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const response = res.json.mock.calls[0][0] as any;
      expect(response.success).toBe(true);
      expect(response.data.precio).toBe(5.50);
    });

    it('should reject invalid price', async () => {
      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        nombre: 'Admin User',
        role: UserRole.ADMIN,
      });

      const req = createMockRequest({
        user: {
          userId: adminUser._id.toString(),
          username: adminUser.username,
          nombre: adminUser.nombre,
          role: adminUser.role,
        },
        params: { id: '60d5ec4e8f8b8d1a2c3b4d5e' },
        body: {
          precio: -1,
        },
      } as any);
      const res = createMockResponse();

      await updatePrecio(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('markAsPagado', () => {
    it('should mark bocadillo as pagado', async () => {
      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        nombre: 'Admin User',
        role: UserRole.ADMIN,
      });

      const { week, year } = getWeekNumber(new Date());
      const bocadillo = await Bocadillo.create({
        nombre: 'Test Bocadillo',
        tamano: 'normal',
        tipoPan: 'normal',
        ingredientes: ['jamon', 'queso'],
        semana: week,
        ano: year,
        precio: 5.50,
      });

      const req = createMockRequest({
        user: {
          userId: adminUser._id.toString(),
          username: adminUser.username,
          nombre: adminUser.nombre,
          role: adminUser.role,
        },
        params: { id: bocadillo._id.toString() },
        body: {
          pagado: true,
        },
      } as any);
      const res = createMockResponse();

      await markAsPagado(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const response = res.json.mock.calls[0][0] as any;
      expect(response.success).toBe(true);
      expect(response.data.pagado).toBe(true);
    });

    it('should reject marking without price', async () => {
      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        nombre: 'Admin User',
        role: UserRole.ADMIN,
      });

      const { week, year } = getWeekNumber(new Date());
      const bocadillo = await Bocadillo.create({
        nombre: 'Test Bocadillo',
        tamano: 'normal',
        tipoPan: 'normal',
        ingredientes: ['jamon', 'queso'],
        semana: week,
        ano: year,
      });

      const req = createMockRequest({
        user: {
          userId: adminUser._id.toString(),
          username: adminUser.username,
          nombre: adminUser.nombre,
          role: adminUser.role,
        },
        params: { id: bocadillo._id.toString() },
        body: {
          pagado: true,
        },
      } as any);
      const res = createMockResponse();

      await markAsPagado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
