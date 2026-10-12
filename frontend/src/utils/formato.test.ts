import { describe, expect, it } from 'vitest';

import { periodoAnterior, rucValido, textoDias } from './formato';

describe('textoDias', () => {
  it.each([
    [4, 'en 4 días'],
    [1, 'mañana'],
    [0, 'vence hoy'],
    [-1, 'ayer'],
    [-12, 'hace 12 días'],
  ])('%i días → "%s"', (dias, esperado) => {
    expect(textoDias(dias, 'pendiente')).toBe(esperado);
  });

  it('no muestra días en obligaciones presentadas', () => {
    expect(textoDias(-5, 'presentada')).toBe('');
  });
});

describe('periodoAnterior', () => {
  it('devuelve el mes anterior', () => {
    expect(periodoAnterior(new Date(2026, 9, 12))).toBe('2026-09');
  });

  it('en enero devuelve diciembre del año anterior', () => {
    expect(periodoAnterior(new Date(2026, 0, 5))).toBe('2025-12');
  });
});

describe('rucValido', () => {
  it.each([
    ['1799999910001', true],
    [' 1799999910001 ', true],
    ['179999991000', false],
    ['1799999910002', false],
    ['17999999A0001', false],
  ])('%s → %s', (ruc, esperado) => {
    expect(rucValido(ruc)).toBe(esperado);
  });
});
