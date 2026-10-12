// Cliente HTTP tipado. Los tipos vienen de `schema.d.ts`, generado a partir del
// contrato OpenAPI del backend (`npm run gen:api`): si el backend cambia un campo,
// el frontend deja de compilar en lugar de fallar en producción.
import type { components } from './schema';

type Schemas = components['schemas'];

export type Cliente = Schemas['Cliente'];
export type ClienteIn = Schemas['ClienteIn'];
export type ClienteCreado = Schemas['ClienteCreado'];
export type Obligacion = Schemas['Obligacion'];
export type EstadoObligacion = Obligacion['estado'];
export type ResumenCliente = Schemas['ResumenCliente'];
export type GenerarPeriodoOut = Schemas['GenerarPeriodoOut'];

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Convierte la respuesta de error de FastAPI en un mensaje legible.
 *  FastAPI devuelve `{detail: "texto"}` o, en errores de validación (422),
 *  `{detail: [{msg: "..."}, ...]}`. */
export function mensajeDeError(cuerpo: unknown, status: number): string {
  if (cuerpo && typeof cuerpo === 'object' && 'detail' in cuerpo) {
    const { detail } = cuerpo as { detail: unknown };
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const mensajes = detail
        .map((d) => (d && typeof d === 'object' && 'msg' in d ? String(d.msg) : ''))
        .filter(Boolean);
      if (mensajes.length) return mensajes.join('; ');
    }
  }
  return `Error ${status}`;
}

async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init?.method ?? 'GET',
    headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const cuerpo: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(mensajeDeError(cuerpo, res.status), res.status);
  return cuerpo as T;
}

export const api = {
  resumen: () => request<ResumenCliente[]>('/clientes/resumen'),

  obligaciones: (estado?: EstadoObligacion) =>
    request<Obligacion[]>(`/obligaciones${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`),

  crearCliente: (datos: ClienteIn) =>
    request<ClienteCreado>('/clientes', { method: 'POST', body: datos }),

  marcarPresentada: (id: number) =>
    request<Obligacion>(`/obligaciones/${id}/presentar`, { method: 'POST' }),

  generarPeriodo: (periodo: string) =>
    request<GenerarPeriodoOut>('/obligaciones/generar', { method: 'POST', body: { periodo } }),
};
