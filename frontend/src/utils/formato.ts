import type { EstadoObligacion } from '../api/client';

export const ETIQUETA_ESTADO: Record<EstadoObligacion, string> = {
  pendiente: 'Por vencer',
  vencida: 'Vencida',
  presentada: 'Presentada',
};

/** Texto relativo de días hasta el vencimiento ("en 4 días", "hace 3 días"). */
export function textoDias(dias: number, estado: EstadoObligacion): string {
  if (estado === 'presentada') return '';
  if (dias === 0) return 'vence hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`;
}

/** Último mes cerrado en formato 'YYYY-MM' (el valor por defecto del generador). */
export function periodoAnterior(hoy: Date = new Date()): string {
  const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  return `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`;
}

/** Validación de formato del RUC (13 dígitos terminados en 001), igual que el backend. */
export const RUC_REGEX = /^\d{10}001$/;

export function rucValido(ruc: string): boolean {
  return RUC_REGEX.test(ruc.trim());
}
