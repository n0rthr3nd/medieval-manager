import { Router } from 'express';
import {
  createBocadillo,
  getBocadillosSemanaActual,
  updateBocadillo,
  deleteBocadillo,
  updatePrecio,
  markAsPagado,
  getBocadillosByWeek,
  getSemanasDisponibles,
} from '../controllers/bocadilloController';
import { checkOrderWindow } from '../middleware/orderWindow';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Obtener bocadillos de la semana actual (requiere autenticación)
router.get('/', authenticateToken, getBocadillosSemanaActual);

// Crear bocadillo (requiere autenticación y ventana abierta)
router.post('/', authenticateToken, checkOrderWindow, createBocadillo);

// Actualizar bocadillo (requiere autenticación y ventana abierta)
router.put('/:id', authenticateToken, checkOrderWindow, updateBocadillo);

// Eliminar bocadillo (requiere autenticación y ventana abierta)
router.delete('/:id', authenticateToken, checkOrderWindow, deleteBocadillo);

// Admin: Actualizar precio de bocadillo
router.patch('/:id/precio', authenticateToken, requireAdmin, updatePrecio);

// Admin: Marcar bocadillo como pagado
router.patch('/:id/pagado', authenticateToken, requireAdmin, markAsPagado);

// Admin: Obtener bocadillos de una semana específica (histórico)
router.get('/admin/historico', authenticateToken, requireAdmin, getBocadillosByWeek);

// Admin: Obtener lista de semanas con pedidos
router.get('/admin/semanas', authenticateToken, requireAdmin, getSemanasDisponibles);

export default router;
