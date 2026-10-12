import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { obligacion } from '../test/datos';
import { ObligacionesTabla } from './ObligacionesTabla';

const props = {
  filtro: '' as const,
  onFiltroChange: vi.fn(),
  onPresentar: vi.fn(),
  enCurso: new Set<number>(),
};

describe('ObligacionesTabla', () => {
  it('muestra el estado y el texto de días de cada obligación', () => {
    render(
      <ObligacionesTabla
        {...props}
        obligaciones={[
          obligacion({ id: 1, estado: 'vencida', dias_restantes: -3 }),
          obligacion({ id: 2, estado: 'pendiente', dias_restantes: 0 }),
        ]}
      />,
    );
    const filas = screen.getAllByRole('row').slice(1); // sin el encabezado
    expect(within(filas[0]!).getByText('Vencida')).toBeInTheDocument();
    expect(within(filas[0]!).getByText('hace 3 días')).toBeInTheDocument();
    expect(within(filas[1]!).getByText('vence hoy')).toBeInTheDocument();
  });

  it('no ofrece el botón en obligaciones ya presentadas', () => {
    render(<ObligacionesTabla {...props} obligaciones={[obligacion({ estado: 'presentada' })]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('llama a onPresentar con el id al hacer clic', async () => {
    const onPresentar = vi.fn();
    render(<ObligacionesTabla {...props} onPresentar={onPresentar} obligaciones={[obligacion({ id: 7 })]} />);
    await userEvent.click(screen.getByRole('button', { name: /marcar como presentada/i }));
    expect(onPresentar).toHaveBeenCalledWith(7);
  });

  it('deshabilita el botón mientras la petición está en curso', () => {
    render(<ObligacionesTabla {...props} enCurso={new Set([7])} obligaciones={[obligacion({ id: 7 })]} />);
    expect(screen.getByRole('button', { name: /marcar como presentada/i })).toBeDisabled();
  });

  it('notifica el cambio de filtro', async () => {
    const onFiltroChange = vi.fn();
    render(<ObligacionesTabla {...props} onFiltroChange={onFiltroChange} obligaciones={[]} />);
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por estado'), 'vencida');
    expect(onFiltroChange).toHaveBeenCalledWith('vencida');
  });

  it('muestra un mensaje cuando no hay resultados', () => {
    render(<ObligacionesTabla {...props} obligaciones={[]} />);
    expect(screen.getByText('No hay obligaciones con ese filtro.')).toBeInTheDocument();
  });
});
