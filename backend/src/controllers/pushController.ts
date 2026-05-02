import { Request, Response } from 'express';
import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription';
import { AuthRequest } from '../middleware/auth';

// Verificar si las claves VAPID están configuradas
const areVapidKeysConfigured = (): boolean => {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
};

// Configurar web-push con las claves VAPID solo si están disponibles
const initializeVapid = (): boolean => {
  if (!areVapidKeysConfigured()) {
    console.warn('⚠️  Las claves VAPID no están configuradas. Las notificaciones push estarán deshabilitadas.');
    console.warn('⚠️  Para habilitar notificaciones push, configura las variables de entorno:');
    console.warn('    - VAPID_PUBLIC_KEY');
    console.warn('    - VAPID_PRIVATE_KEY');
    console.warn('    - VAPID_SUBJECT');
    return false;
  }

  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@medievalmanager.com',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    console.log('✅ Claves VAPID configuradas correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al configurar claves VAPID:', error);
    return false;
  }
};

// Inicializar VAPID al cargar el módulo (sin fallar si no están configuradas)
const vapidInitialized = initializeVapid();

// Obtener clave pública VAPID
export const getVapidPublicKey = async (req: Request, res: Response) => {
  try {
    if (!vapidInitialized || !areVapidKeysConfigured()) {
      console.error('VAPID_PUBLIC_KEY no está configurada en las variables de entorno');
      return res.status(503).json({
        success: false,
        error: 'Las notificaciones push no están habilitadas en el servidor. Por favor, contacta al administrador.',
      });
    }

    res.json({
      success: true,
      publicKey: process.env.VAPID_PUBLIC_KEY,
    });
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la clave pública',
    });
  }
};

// Suscribir usuario a notificaciones push
export const subscribe = async (req: Request, res: Response) => {
  try {
    if (!vapidInitialized || !areVapidKeysConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Las notificaciones push no están habilitadas en el servidor',
      });
    }

    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        success: false,
        error: 'Datos de suscripción inválidos',
      });
    }

    // Crear o actualizar suscripción
    await PushSubscription.findOneAndUpdate(
      { userId: user.userId, endpoint },
      {
        userId: user.userId,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Suscripción creada correctamente',
    });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la suscripción',
    });
  }
};

// Cancelar suscripción
export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const { endpoint } = req.body;

    await PushSubscription.deleteOne({
      userId: user.userId,
      endpoint,
    });

    res.json({
      success: true,
      message: 'Suscripción cancelada correctamente',
    });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cancelar la suscripción',
    });
  }
};

// Enviar notificación a todos los usuarios suscritos
export const sendNotificationToAll = async (
  title: string,
  body: string,
  data?: any,
  excludeUserIds?: string[]
) => {
  try {
    if (!vapidInitialized || !areVapidKeysConfigured()) {
      console.warn('No se pueden enviar notificaciones: VAPID no configurado');
      return;
    }

    // Obtener todas las suscripciones
    let subscriptions = await PushSubscription.find({});

    // Filtrar usuarios excluidos si se proporciona la lista
    if (excludeUserIds && excludeUserIds.length > 0) {
      subscriptions = subscriptions.filter(
        (sub) => !excludeUserIds.includes(sub.userId.toString())
      );
      console.log(`Filtered out ${excludeUserIds.length} users - sending to ${subscriptions.length} users`);
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-96x96.png',
      data: data || {},
    });

    const notifications = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          payload
        );
      } catch (error: any) {
        // Si la suscripción es inválida, eliminarla
        if (error.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: subscription._id });
        }
        console.error('Error sending notification:', error);
      }
    });

    await Promise.all(notifications);
    console.log(`Sent ${subscriptions.length} notifications`);
  } catch (error) {
    console.error('Error sending notifications to all:', error);
    throw error;
  }
};

// Endpoint para que admin envíe notificaciones manuales (solo admin)
export const sendManualNotification = async (req: Request, res: Response) => {
  try {
    if (!vapidInitialized || !areVapidKeysConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Las notificaciones push no están habilitadas en el servidor',
      });
    }

    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Título y mensaje son requeridos',
      });
    }

    // Importar dependencias necesarias para filtrado
    const Settings = (await import('../models/Settings')).default;
    const Bocadillo = (await import('../models/Bocadillo')).default;
    const { getTargetWeek } = await import('../utils/dateUtils');

    // Verificar si los pedidos están cerrados
    const settings = await Settings.findOne();
    if (settings?.ordersClosed) {
      return res.status(400).json({
        success: false,
        error: 'No se pueden enviar notificaciones mientras los pedidos están cerrados',
      });
    }

    // Obtener usuarios que YA tienen bocadillo para esta semana (la del próximo viernes)
    const { week, year } = getTargetWeek(new Date());
    const bocadillos = await Bocadillo.find({ semana: week, ano: year });
    const usersWithOrder = bocadillos
      .map((b) => b.userId?.toString())
      .filter((id): id is string => !!id);

    console.log(`Sending manual notification - excluding ${usersWithOrder.length} users with orders`);

    // Enviar notificación solo a usuarios sin pedido
    await sendNotificationToAll(title, body, data, usersWithOrder);

    res.json({
      success: true,
      message: `Notificaciones enviadas correctamente (excluidos ${usersWithOrder.length} usuarios que ya tienen pedido)`,
    });
  } catch (error) {
    console.error('Error sending manual notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar las notificaciones',
    });
  }
};
