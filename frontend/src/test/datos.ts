import type { Obligacion, ResumenCliente } from '../api/client';

export const obligacion = (parcial: Partial<Obligacion> = {}): Obligacion => ({
  id: 1,
  cliente_id: 1,
  razon_social: 'Comercial Andina Demo S.A.',
  ruc: '1799999910001',
  tipo: 'IVA',
  tipo_nombre: 'Declaración mensual de IVA',
  periodo: '2026-09',
  fecha_vencimiento: '2026-10-10',
  estado: 'pendiente',
  dias_restantes: 4,
  ...parcial,
});

export const resumen = (parcial: Partial<ResumenCliente> = {}): ResumenCliente => ({
  cliente_id: 1,
  ruc: '1799999910001',
  razon_social: 'Comercial Andina Demo S.A.',
  total: 2,
  presentadas: 0,
  por_vencer: 1,
  vencidas: 1,
  ...parcial,
});

/** Respuesta HTTP falsa para simular `fetch`. */
export const respuesta = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
