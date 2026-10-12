import { describe, expect, it, vi } from 'vitest';

import { respuesta } from '../test/datos';
import { api, ApiError, mensajeDeError } from './client';

describe('mensajeDeError', () => {
  it('usa el detail de texto de FastAPI', () => {
    expect(mensajeDeError({ detail: 'Ya existe un cliente con ese RUC' }, 409)).toBe(
      'Ya existe un cliente con ese RUC',
    );
  });

  it('une los mensajes de un error de validación 422', () => {
    const cuerpo = { detail: [{ msg: 'RUC inválido' }, { msg: 'Falta razón social' }] };
    expect(mensajeDeError(cuerpo, 422)).toBe('RUC inválido; Falta razón social');
  });

  it('cae a un mensaje genérico si el cuerpo no es reconocible', () => {
    expect(mensajeDeError(null, 500)).toBe('Error 500');
    expect(mensajeDeError({ detail: [] }, 502)).toBe('Error 502');
  });
});

describe('api', () => {
  it('envía el filtro de estado como query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta([]));
    vi.stubGlobal('fetch', fetchMock);
    await api.obligaciones('vencida');
    expect(fetchMock).toHaveBeenCalledWith('/api/obligaciones?estado=vencida', expect.objectContaining({ method: 'GET' }));
  });

  it('envía JSON en los POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta({ periodo: '2026-09', creadas: 10 }, 201));
    vi.stubGlobal('fetch', fetchMock);
    await api.generarPeriodo('2026-09');
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ periodo: '2026-09' });
  });

  it('lanza ApiError con el status y el mensaje del backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({ detail: 'Obligación no encontrada' }, 404)));
    await expect(api.marcarPresentada(99)).rejects.toEqual(new ApiError('Obligación no encontrada', 404));
  });
});
