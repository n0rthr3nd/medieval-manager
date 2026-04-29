import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import User, { UserRole, ChatbotMode } from '../models/User';
import Settings from '../models/Settings';
import { registerSchema, loginSchema } from '../validators/authValidator';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export const register = async (req: Request, res: Response) => {
  try {
    // Verificar si el registro público está habilitado
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ publicRegistrationEnabled: false });
      await settings.save();
    }

    if (!settings.publicRegistrationEnabled) {
      return res.status(403).json({
        success: false,
        error: 'El registro público está deshabilitado. Contacta con un administrador.',
      });
    }

    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ username: validatedData.username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya existe',
      });
    }

    // Create new user
    const user = new User({
      ...validatedData,
      role: UserRole.USER, // Default role
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        nombre: user.nombre,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          nombre: user.nombre,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        details: error.errors,
      });
    }

    console.error('Error during registration:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar el usuario',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ username: validatedData.username });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        nombre: user.nombre,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          nombre: user.nombre,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        details: error.errors,
      });
    }

    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      error: 'Error al iniciar sesión',
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
      });
    }

    // Get fresh user data from database
    const userData = await User.findById(user.userId).select('-password');

    if (!userData) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    res.json({
      success: true,
      data: {
        id: userData._id,
        username: userData.username,
        nombre: userData.nombre,
        role: userData.role,
        chatbotMode: userData.chatbotMode,
      },
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el usuario',
    });
  }
};

// Admin: Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users.map(user => ({
        id: user._id,
        username: user.username,
        nombre: user.nombre,
        role: user.role,
        chatbotMode: user.chatbotMode,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los usuarios',
    });
  }
};

// Admin: Create new user
export const createUser = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username: validatedData.username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya existe',
      });
    }

    // Create new user
    const user = new User({
      ...validatedData,
      role: role || UserRole.USER,
    });

    await user.save();

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        nombre: user.nombre,
        role: user.role,
      },
      message: 'Usuario creado correctamente',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        details: error.errors,
      });
    }

    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el usuario',
    });
  }
};

// Admin: Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, nombre, role, password, chatbotMode } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    // Verificar si el username ya está en uso por otro usuario
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario ya está en uso',
        });
      }
      user.username = username;
    }

    // Actualizar campos
    if (nombre) user.nombre = nombre;
    if (role) user.role = role;
    if (chatbotMode && Object.values(ChatbotMode).includes(chatbotMode)) {
      user.chatbotMode = chatbotMode;
    }
    if (password) {
      // La contraseña se hashea automáticamente en el pre-save hook
      user.password = password;
    }

    await user.save();

    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        nombre: user.nombre,
        role: user.role,
        chatbotMode: user.chatbotMode,
      },
      message: 'Usuario actualizado correctamente',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el usuario',
    });
  }
};

// Admin: Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    await User.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el usuario',
    });
  }
};
