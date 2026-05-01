import { registerSchema, loginSchema } from '../validators/authValidator';
import { TamanoBocadillo, TipoPan } from '../models/Bocadillo';
import { createBocadilloSchema } from '../validators/bocadilloValidator';
import { createIngredienteSchema, updateIngredienteSchema } from '../validators/ingredienteValidator';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        username: 'john',
        password: 'password123',
        nombre: 'John Doe',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject username with less than 3 characters', () => {
      const invalidData = {
        username: 'jo',
        password: 'password123',
        nombre: 'John Doe',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const usernameError = result.error.errors.find((e) => e.path.includes('username'));
        expect(usernameError?.message).toBe('El username debe tener al menos 3 caracteres');
      }
    });

    it('should reject password with less than 6 characters', () => {
      const invalidData = {
        username: 'john',
        password: 'pass',
        nombre: 'John Doe',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.errors.find((e) => e.path.includes('password'));
        expect(passwordError?.message).toBe('La contraseña debe tener al menos 6 caracteres');
      }
    });

    it('should transform username to lowercase', () => {
      const data = {
        username: 'JOHN',
        password: 'password123',
        nombre: 'John Doe',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('john');
      }
    });

    it('should transform nombre to uppercase', () => {
      const data = {
        username: 'john',
        password: 'password123',
        nombre: 'john doe',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nombre).toBe('JOHN DOE');
      }
    });

    it('should reject nombre with less than 1 character', () => {
      const invalidData = {
        username: 'john',
        password: 'password123',
        nombre: '',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        username: 'john',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should transform username to lowercase', () => {
      const data = {
        username: 'JOHN',
        password: 'password123',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('john');
      }
    });
  });
});

describe('Bocadillo Validators', () => {
  describe('createBocadilloSchema', () => {
    it('should validate valid bocadillo data', () => {
      const validData = {
        nombre: 'Mi Bocadillo',
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.NORMAL,
        ingredientes: ['jamón', 'queso'],
        bocataPredefinido: 'Alquimista',
      };

      const result = createBocadilloSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject nombre with less than 1 character', () => {
      const invalidData = {
        nombre: '',
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.NORMAL,
        ingredientes: ['jamón', 'queso'],
      };

      const result = createBocadilloSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject nombre with more than 50 characters', () => {
      const invalidData = {
        nombre: 'A'.repeat(51),
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.NORMAL,
        ingredientes: ['jamón', 'queso'],
      };

      const result = createBocadilloSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject tamano with invalid enum value', () => {
      const invalidData = {
        nombre: 'Mi Bocadillo',
        tamano: 'invalid',
        tipoPan: TipoPan.NORMAL,
        ingredientes: ['jamón', 'queso'],
      };

      const result = createBocadilloSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject tipoPan with invalid enum value', () => {
      const invalidData = {
        nombre: 'Mi Bocadillo',
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: 'invalid',
        ingredientes: ['jamón', 'queso'],
      };

      const result = createBocadilloSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject ingredientes with less than 1 item', () => {
      const invalidData = {
        nombre: 'Mi Bocadillo',
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.NORMAL,
        ingredientes: [],
      };

      const result = createBocadilloSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject ingredientes with more than 10 items', () => {
      const invalidData = {
        nombre: 'Mi Bocadillo',
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.NORMAL,
        ingredientes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
      };

      const result = createBocadilloSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject grande size with integral bread', () => {
      const invalidData = {
        nombre: 'Mi Bocadillo',
        tamano: TamanoBocadillo.GRANDE,
        tipoPan: TipoPan.INTEGRAL,
        ingredientes: ['jamón', 'queso'],
      };

      const result = createBocadilloSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject grande size with semillas bread', () => {
      const invalidData = {
        nombre: 'Mi Bocadillo',
        tamano: TamanoBocadillo.GRANDE,
        tipoPan: TipoPan.SEMILLAS,
        ingredientes: ['jamón', 'queso'],
      };

      const result = createBocadilloSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow normal size with integral bread', () => {
      const validData = {
        nombre: 'Mi Bocadillo',
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.INTEGRAL,
        ingredientes: ['jamón', 'queso'],
      };

      const result = createBocadilloSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should transform nombre to uppercase', () => {
      const data = {
        nombre: 'mi bocadillo',
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.NORMAL,
        ingredientes: ['jamón', 'queso'],
      };

      const result = createBocadilloSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nombre).toBe('MI BOCADILLO');
      }
    });
  });
});

describe('Ingrediente Validators', () => {
  describe('createIngredienteSchema', () => {
    it('should validate valid ingrediente data', () => {
      const validData = {
        nombre: 'Jamón',
        categoria: 'Embutidos',
        disponible: true,
        orden: 1,
      };

      const result = createIngredienteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject nombre with less than 1 character', () => {
      const invalidData = {
        nombre: '',
        categoria: 'Embutidos',
      };

      const result = createIngredienteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject nombre with more than 100 characters', () => {
      const invalidData = {
        nombre: 'A'.repeat(101),
        categoria: 'Embutidos',
      };

      const result = createIngredienteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional categoria', () => {
      const data = {
        nombre: 'Jamón',
      };

      const result = createIngredienteSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should default disponible to true when not provided', () => {
      const data = {
        nombre: 'Jamón',
      };

      const result = createIngredienteSchema.safeParse(data);
      if (result.success) {
        expect(result.data.disponible).toBe(true);
      }
    });

    it('should default orden to 0 when not provided', () => {
      const data = {
        nombre: 'Jamón',
      };

      const result = createIngredienteSchema.safeParse(data);
      if (result.success) {
        expect(result.data.orden).toBe(0);
      }
    });

    it('should reject categoria with more than 50 characters', () => {
      const invalidData = {
        nombre: 'Jamón',
        categoria: 'A'.repeat(51),
      };

      const result = createIngredienteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateIngredienteSchema', () => {
    it('should validate partial updates', () => {
      const validData = {
        nombre: 'Jamón',
        disponible: false,
      };

      const result = updateIngredienteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow empty object for update', () => {
      const result = updateIngredienteSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
