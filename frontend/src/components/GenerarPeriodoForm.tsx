import { useState, type FormEvent } from 'react';

import { periodoAnterior } from '../utils/formato';

interface Props {
  onGenerar: (periodo: string) => Promise<void>;
}

export function GenerarPeriodoForm({ onGenerar }: Props) {
  const [periodo, setPeriodo] = useState(periodoAnterior);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    await onGenerar(periodo);
    setEnviando(false);
  }

  return (
    <form className="form-inline" onSubmit={enviar}>
      <label htmlFor="periodo">Período</label>
      <input id="periodo" type="month" required value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
      <button type="submit" className="btn btn--light" disabled={enviando}>
        Generar obligaciones
      </button>
    </form>
  );
}
