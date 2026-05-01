import { Request, Response } from 'express';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import User, { UserRole } from '../models/User';
import Settings from '../models/Settings';
import { ensureDBConnected } from '../test/setup';
import { register, login, getCurrentUser, getAllUsers, createUser, updateUser, deleteUser } from './authController';

beforeAll(async () => {
  await ensureDBConnected();
});

describe('authController', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Settings.deleteMany({});
    // Enable public registration for tests that need it
    await Settings.create({ publicRegistrationEnabled: true });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Settings.deleteMany({});
  });

  const createMockResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any);

  // Helper to check response structure and return the data
  const checkResponse = (res: any, expectedStatus: number, success: boolean) => {
    expect(res.status).toHaveBeenCalledWith(expectedStatus);
    expect(res.json).toHaveBeenCalledTimes(1);
    const response = res.json.mock.calls[0][0] as any;
    expect(response.success).toBe(success);
    return response;
  };

  // Helper for controllers that don't call status() explicitly
  const checkJsonResponse = (res: any, success: boolean) => {
    expect(res.json).toHaveBeenCalledTimes(1);
    const response = res.json.mock.calls[0][0] as any;
    expect(response.success).toBe(success);
    return response;
  };

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const req = {
        body: {
          username: 'testuser',
          password: 'password123',
          nombre: 'Test User',
        },
      } as any;
      const res = createMockResponse();

      await register(req, res);

      checkResponse(res, 201, true);
      const response = res.json.mock.calls[0][0];
      expect(response.data.token).toBeDefined();
      expect(response.data.user.username).toBe('testuser');
      expect(response.data.user.role).toBe(UserRole.USER);
    });

    it('should reject registration when user already exists', async () => {
      await User.create({
        username: 'existing',
        password: 'password123',
        nombre: 'Existing User',
      });

      const req = {
        body: {
          username: 'existing',
          password: 'password123',
          nombre: 'Duplicate User',
        },
      } as any;
      const res = createMockResponse();

      await register(req, res);

      checkResponse(res, 400, false);
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('El usuario ya existe');
    });

    it('should reject registration when public registration is disabled', async () => {
      // Delete existing settings first to ensure we start fresh
      await Settings.deleteMany({});
      await Settings.create({
        publicRegistrationEnabled: false,
      });

      const req = {
        body: {
          username: 'newuser',
          password: 'password123',
          nombre: 'New User',
        },
      } as any;
      const res = createMockResponse();

      await register(req, res);

      checkResponse(res, 403, false);
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('El registro público está deshabilitado. Contacta con un administrador.');
    });

    it('should reject registration with invalid data', async () => {
      const req = {
        body: {
          username: 'jo',
          password: 'pass',
          nombre: '',
        },
      } as any;
      const res = createMockResponse();

      await register(req, res);

      checkResponse(res, 400, false);
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Validación fallida');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await User.create({
        username: 'testuser',
        password: 'password123',
        nombre: 'Test User',
      });
    });

    it('should login successfully with correct credentials', async () => {
      const req = {
        body: {
          username: 'testuser',
          password: 'password123',
        },
      } as any;
      const res = createMockResponse();

      await login(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.token).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const req = {
        body: {
          username: 'testuser',
          password: 'wrongpassword',
        },
      } as any;
      const res = createMockResponse();

      await login(req, res);

      checkResponse(res, 401, false);
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Credenciales inválidas');
    });

    it('should reject login when user does not exist', async () => {
      const req = {
        body: {
          username: 'nonexistent',
          password: 'password123',
        },
      } as any;
      const res = createMockResponse();

      await login(req, res);

      checkResponse(res, 401, false);
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Credenciales inválidas');
    });

    it('should reject login with invalid data', async () => {
      const req = {
        body: {
          password: 'password123',
        },
      } as any;
      const res = createMockResponse();

      await login(req, res);

      checkResponse(res, 400, false);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const user = await User.create({
        username: 'testuser',
        password: 'password123',
        nombre: 'Test User',
        role: UserRole.USER,
      });

      const req = {
        user: {
          userId: user._id.toString(),
          username: user.username,
          nombre: user.nombre,
          role: user.role,
        },
      } as any;
      const res = createMockResponse();

      await getCurrentUser(req, res);

      checkJsonResponse(res, true);
      const response = res.json.mock.calls[0][0];
      expect(response.data.id).toBeDefined();
      expect(response.data.username).toBe('testuser');
    });

    it('should reject when user is not authenticated', async () => {
      const req = {} as any;
      const res = createMockResponse();

      await getCurrentUser(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error).toBe('No autenticado');
    });
  });

  describe('getAllUsers', () => {
    beforeEach(async () => {
      await User.deleteMany({});
      await User.create([
        {
          username: 'user1',
          password: 'password123',
          nombre: 'User One',
          role: UserRole.USER,
        },
        {
          username: 'user2',
          password: 'password123',
          nombre: 'User Two',
          role: UserRole.USER,
        },
      ]);
    });

    it('should return all users for admin', async () => {
      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        nombre: 'Admin User',
        role: UserRole.ADMIN,
      });

      const req = {
        user: {
          userId: adminUser._id.toString(),
          username: adminUser.username,
          nombre: adminUser.nombre,
          role: adminUser.role,
        },
      } as any;
      const res = createMockResponse();

      await getAllUsers(req, res);

      checkJsonResponse(res, true);
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(3);
      expect(response.data[0].password).toBeUndefined();
    });
  });

  describe('createUser', () => {
    beforeEach(async () => {
      await Settings.create({
        publicRegistrationEnabled: true,
      });
    });

    it('should create a new user for admin', async () => {
      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        nombre: 'Admin User',
        role: UserRole.ADMIN,
      });

      const req = {
        user: {
          userId: adminUser._id.toString(),
          username: adminUser.username,
          nombre: adminUser.nombre,
          role: adminUser.role,
        },
      } as any;
      (req as any).body = {
        username: 'newuser',
        password: 'password123',
        nombre: 'New User',
        role: UserRole.USER,
      };
      const res = createMockResponse();

      await createUser(req, res);

      checkResponse(res, 201, true);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.username).toBe('newuser');
    });
  });

  describe('updateUser', () => {
    it('should update user info for admin', async () => {
      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        nombre: 'Admin User',
        role: UserRole.ADMIN,
      });

      const userToUpdate = await User.create({
        username: 'userToUpdate',
        password: 'password123',
        nombre: 'User To Update',
        role: UserRole.USER,
      });

      const req = {
        user: {
          userId: adminUser._id.toString(),
          username: adminUser.username,
          nombre: adminUser.nombre,
          role: adminUser.role,
        },
        params: { id: userToUpdate._id.toString() },
      } as any;
      (req as any).body = {
        username: 'updateduser',
        nombre: 'Updated User',
        role: UserRole.ADMIN,
      };
      const res = createMockResponse();

      await updateUser(req, res);

      checkJsonResponse(res, true);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.username).toBe('updateduser');
    });

    it('should reject when trying to update username to an existing one', async () => {
      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        nombre: 'Admin User',
        role: UserRole.ADMIN,
      });

      await User.create({
        username: 'existinguser',
        password: 'password123',
        nombre: 'Existing User',
        role: UserRole.USER,
      });

      const userToUpdate = await User.create({
        username: 'userToUpdate',
        password: 'password123',
        nombre: 'User To Update',
        role: UserRole.USER,
      });

      const req = {
        user: {
          userId: adminUser._id.toString(),
          username: adminUser.username,
          nombre: adminUser.nombre,
          role: adminUser.role,
        },
        params: { id: userToUpdate._id.toString() },
      } as any;
      (req as any).body = {
        username: 'existinguser',
      };
      const res = createMockResponse();

      await updateUser(req, res);

      checkResponse(res, 400, false);
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('El nombre de usuario ya está en uso');
    });
  });

  describe('deleteUser', () => {
    it('should delete user for admin', async () => {
      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        nombre: 'Admin User',
        role: UserRole.ADMIN,
      });

      const userToDelete = await User.create({
        username: 'userToDelete',
        password: 'password123',
        nombre: 'User To Delete',
        role: UserRole.USER,
      });

      const req = {
        user: {
          userId: adminUser._id.toString(),
          username: adminUser.username,
          nombre: adminUser.nombre,
          role: adminUser.role,
        },
        params: { id: userToDelete._id.toString() },
      } as any;
      const res = createMockResponse();

      await deleteUser(req, res);

      checkJsonResponse(res, true);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);

      const deletedUser = await User.findById(userToDelete._id);
      expect(deletedUser).toBeNull();
    });
  });
});
