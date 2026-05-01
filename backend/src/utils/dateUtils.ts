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
 * Verifica si la fecha actual está dentro de la ventana de pedidos
 * Sábado 00:00 - Viernes 23:59 (pedidos para el viernes siguiente)
 *
 * El sistema permite hacer pedidos para el viernes de la próxima semana
 * desde el sábado de la semana actual.
 */
export function isWithinOrderWindow(date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Sábado (6), Domingo (0), Lunes (1), Martes (2), Miércoles (3), Jueves (4) - todo el día
  if (dayOfWeek === 6 || dayOfWeek === 0 || dayOfWeek >= 1 && dayOfWeek <= 4) {
    return true;
  }

  // Viernes (5) - todo el día hasta las 23:59
  if (dayOfWeek === 5) {
    return hours < 23 || (hours === 23 && minutes <= 59);
  }

  return false;
}

/**
 * Obtiene la fecha del próximo viernes
 */
export function getNextFriday(date: Date = new Date()): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  // Calcular días hasta el próximo viernes (5)
  const daysUntilFriday = dayOfWeek === 5 ? 7 : (5 - dayOfWeek + 7) % 7;
  result.setDate(result.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
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
