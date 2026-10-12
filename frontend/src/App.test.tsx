import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import App from './App';
import { obligacion, resumen, respuesta } from './test/datos';

/** Simula el backend: responde según método y ruta. */
function backendFalso(rutas: Record<string, () => Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const clave = `${init?.method ?? 'GET'} ${url}`;
    const handler = rutas[clave];
    if (!handler) throw new Error(`Ruta no simulada: ${clave}`);
    return handler();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('App', () => {
  it('carga el resumen y las obligaciones al iniciar', async () => {
    backendFalso({
      'GET /api/clientes/resumen': () => respuesta([resumen({ vencidas: 2 })]),
      'GET /api/obligaciones': () => respuesta([obligacion()]),
    });
    render(<App />);
    expect(await screen.findAllByText('Comercial Andina Demo S.A.')).toHaveLength(2);
    expect(screen.getByText('Por vencer', { selector: '.badge' })).toBeInTheDocument();
  });

  it('marca una obligación como presentada y recarga los datos', async () => {
    let presentada = false;
    const fetchMock = backendFalso({
      'GET /api/clientes/resumen': () => respuesta([resumen()]),
      'GET /api/obligaciones': () =>
        respuesta([obligacion({ id: 5, estado: presentada ? 'presentada' : 'pendiente' })]),
      'POST /api/obligaciones/5/presentar': () => {
        presentada = true;
        return respuesta(obligacion({ id: 5, estado: 'presentada' }));
      },
    });
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /marcar como presentada/i }));

    expect(await screen.findByText('Obligación marcada como presentada')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: /marcar como presentada/i })).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/obligaciones/5/presentar', expect.objectContaining({ method: 'POST' }));
  });

  it('muestra el error del backend al crear un cliente duplicado', async () => {
    backendFalso({
      'GET /api/clientes/resumen': () => respuesta([]),
      'GET /api/obligaciones': () => respuesta([]),
      'POST /api/clientes': () => respuesta({ detail: 'Ya existe un cliente con ese RUC' }, 409),
    });
    render(<App />);
    await userEvent.type(screen.getByLabelText('RUC'), '1799999910001');
    await userEvent.type(screen.getByLabelText('Razón social'), 'Duplicado S.A.');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cliente' }));
    expect(await screen.findByText('Ya existe un cliente con ese RUC')).toBeInTheDocument();
  });

  it('valida el RUC en el cliente antes de llamar a la API', async () => {
    const fetchMock = backendFalso({
      'GET /api/clientes/resumen': () => respuesta([]),
      'GET /api/obligaciones': () => respuesta([]),
    });
    render(<App />);
    await userEvent.type(screen.getByLabelText('RUC'), '123');
    await userEvent.type(screen.getByLabelText('Razón social'), 'Cliente S.A.');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cliente' }));
    expect(screen.getByText('El RUC debe tener 13 dígitos y terminar en 001')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/clientes', expect.anything());
  });
});
