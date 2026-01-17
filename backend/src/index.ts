import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import bocadilloRoutes from './routes/bocadilloRoutes';
import menuRoutes from './routes/menuRoutes';
import authRoutes from './routes/authRoutes';
import alquimistaRoutes from './routes/alquimistaRoutes';
import settingsRoutes from './routes/settingsRoutes';
import ingredientesRoutes from './routes/ingredientesRoutes';
import systemConfigRoutes from './routes/systemConfigRoutes';
import pushRoutes from './routes/pushRoutes';
import estadisticasRoutes from './routes/estadisticasRoutes';
import aiRecommendationRoutes from './routes/aiRecommendationRoutes';
import User, { UserRole } from './models/User';
import Ingrediente from './models/Ingrediente';
import { INGREDIENTES_DISPONIBLES } from './config/menu';
import { initNotificationScheduler } from './services/notificationScheduler';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configuration (temporary: allow all for debugging)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de peticiones en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/bocadillos', bocadilloRoutes);
app.use('/api/alquimista', alquimistaRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ingredientes', ingredientesRoutes);
app.use('/api/system', systemConfigRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/ai-recommendations', aiRecommendationRoutes);

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores global
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Función para crear el usuario admin inicial
const createInitialAdmin = async () => {
  try {
    const adminData = {
      username: 'admin',
      password: 'admin123',
      nombre: 'EDUARDO CANALS',
      role: UserRole.ADMIN,
    };

    const existingAdmin = await User.findOne({ username: adminData.username });

    if (!existingAdmin) {
      const admin = new User(adminData);
      await admin.save();
      console.log('✅ Usuario administrador inicial creado');
      console.log(`   Username: ${admin.username}`);
      console.log(`   Password: ${adminData.password} (cambiar después del primer login)`);
      console.log(`   Nombre: ${admin.nombre}`);
    } else {
      console.log('ℹ️  Usuario administrador ya existe');
    }
  } catch (error) {
    console.error('⚠️  Error al crear usuario administrador inicial:', error);
    // No detenemos el servidor si falla la creación del admin
  }
};

// Función para categorizar ingredientes automáticamente
const categorizarIngrediente = (nombre: string): string => {
  const nombreLower = nombre.toLowerCase();

  if (nombreLower.includes('pollo') || nombreLower.includes('costillas') ||
      nombreLower.includes('carillada') || nombreLower.includes('chilindron') ||
      nombreLower.includes('kebab')) {
    return 'Carnes y Aves';
  }
  if (nombreLower.includes('tortilla')) {
    return 'Tortillas';
  }
  if (nombreLower.includes('jamón') || nombreLower.includes('longaniza') ||
      nombreLower.includes('chorizo') || nombreLower.includes('morcilla') ||
      nombreLower.includes('pavo') || nombreLower.includes('bacon')) {
    return 'Embutidos';
  }
  if (nombreLower.includes('queso')) {
    return 'Quesos';
  }
  if (nombreLower.includes('tomate') || nombreLower.includes('lechuga') ||
      nombreLower.includes('cebolla') || nombreLower.includes('ensalada') ||
      nombreLower.includes('olivas')) {
    return 'Vegetales';
  }
  if (nombreLower.includes('atún') || nombreLower.includes('anchoas') ||
      nombreLower.includes('mojama')) {
    return 'Pescados';
  }
  if (nombreLower.includes('huevo')) {
    return 'Huevos';
  }
  if (nombreLower.includes('mayonesa') || nombreLower.includes('mostaza') ||
      nombreLower.includes('aceite')) {
    return 'Condimentos';
  }
  if (nombreLower.includes('patata')) {
    return 'Guarniciones';
  }

  return 'Otros';
};

// Función para inicializar ingredientes automáticamente
const initializeIngredientes = async () => {
  try {
    const existingCount = await Ingrediente.countDocuments();

    if (existingCount > 0) {
      console.log(`ℹ️  Ya existen ${existingCount} ingredientes en la base de datos`);
      return;
    }

    console.log('🔄 Inicializando ingredientes...');
    let agregados = 0;

    for (let i = 0; i < INGREDIENTES_DISPONIBLES.length; i++) {
      const nombreIngrediente = INGREDIENTES_DISPONIBLES[i];

      const ingrediente = new Ingrediente({
        nombre: nombreIngrediente,
        categoria: categorizarIngrediente(nombreIngrediente),
        disponible: true,
        orden: i,
      });

      await ingrediente.save();
      agregados++;
    }

    console.log(`✅ ${agregados} ingredientes inicializados correctamente`);
  } catch (error) {
    console.error('⚠️  Error al inicializar ingredientes:', error);
    // No detenemos el servidor si falla la inicialización
  }
};

// Iniciar servidor
const startServer = async () => {
  try {
    await connectDatabase();

    // Crear admin inicial automáticamente
    await createInitialAdmin();

    // Inicializar ingredientes automáticamente
    await initializeIngredientes();

    // Inicializar scheduler de notificaciones
    initNotificationScheduler();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
