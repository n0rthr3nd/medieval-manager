/**
 * Obtiene el número de semana del año (ISO 8601)
 */
export function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

/**
 * Verifica si la fecha actual está dentro de la ventana de pedidos.
 *
 * Ventana: Sábado 00:00 → Jueves 17:00 server (= 19:00 Madrid CEST).
 * El viernes está cerrado (día de reparto).
 *
 * NOTA: la comparación de horas usa la zona horaria local del servidor.
 * En Render (UTC), 17:00 server = 19:00 Madrid en verano (CEST) y
 * 18:00 Madrid en invierno (CET).
 */
export function isWithinOrderWindow(date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Sábado (6), Domingo (0), Lunes (1), Martes (2), Miércoles (3) - todo el día
  if (dayOfWeek === 6 || dayOfWeek === 0 || (dayOfWeek >= 1 && dayOfWeek <= 3)) {
    return true;
  }

  // Jueves (4) - hasta las 17:00 server (19:00 Madrid)
  if (dayOfWeek === 4) {
    return hours < 17 || (hours === 17 && minutes === 0);
  }

  // Viernes (5) - cerrado, día de reparto
  return false;
}

/**
 * Obtiene la fecha del viernes objetivo del ciclo de pedidos actual.
 * Si hoy es viernes (día de reparto), devuelve hoy — la ventana de pedidos
 * sigue abierta hasta viernes 23:59 PARA ese mismo viernes.
 */
export function getNextFriday(date: Date = new Date()): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  result.setDate(result.getDate() + daysUntilFriday);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Obtiene la fecha del próximo lunes (mantener por compatibilidad)
 */
export function getNextMonday(date: Date = new Date()): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  result.setDate(result.getDate() + daysUntilMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Obtiene la fecha del próximo sábado
 */
export function getNextSaturday(date: Date = new Date()): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  // Sábado es día 6
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek + 7) % 7;
  result.setDate(result.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Obtiene la fecha del jueves de la semana actual a las 17:00
 */
export function getThursdayDeadline(date: Date = new Date()): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const daysUntilThursday = dayOfWeek <= 4 ? 4 - dayOfWeek : 11 - dayOfWeek;
  result.setDate(result.getDate() + daysUntilThursday);
  result.setHours(17, 0, 0, 0);
  return result;
}

/**
 * Obtiene la fecha del viernes a las 23:59 (la fecha límite para pedidos).
 * Si hoy es viernes, devuelve hoy a las 23:59 (la ventana cierra esta noche).
 */
export function getFridayDeadline(date: Date = new Date()): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  result.setDate(result.getDate() + daysUntilFriday);
  result.setHours(23, 59, 0, 0);
  return result;
}

/**
 * Obtiene el lunes de la semana actual
 */
export function getCurrentMonday(date: Date = new Date()): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Obtiene la semana objetivo para pedidos
 * Dado que los pedidos se hacen desde Sábado hasta Viernes para el siguiente viernes,
 * necesitamos determinar a qué semana pertenece el "objetivo" (el próximo viernes)
 */
export function getTargetWeek(date: Date = new Date()): { week: number; year: number } {
  return getWeekNumber(getNextFriday(date));
}
