import { useState, type FormEvent } from 'react';

import type { ClienteIn } from '../api/client';
import { rucValido } from '../utils/formato';

interface Props {
  onCrear: (datos: ClienteIn) => Promise<boolean>;
}

const VACIO = { ruc: '', razon_social: '', email: '' };

export function NuevoClienteForm({ onCrear }: Props) {
  const [valores, setValores] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [tocadoRuc, setTocadoRuc] = useState(false);

  const errorRuc = tocadoRuc && valores.ruc !== '' && !rucValido(valores.ruc)
    ? 'El RUC debe tener 13 dígitos y terminar en 001'
    : '';

  const cambiar = (campo: keyof typeof VACIO) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTocadoRuc(true);
    if (!rucValido(valores.ruc)) return;
    setEnviando(true);
    const ok = await onCrear({
      ruc: valores.ruc.trim(),
      razon_social: valores.razon_social.trim(),
      email: valores.email.trim() || null,
    });
    setEnviando(false);
    if (ok) {
      setValores(VACIO);
      setTocadoRuc(false);
    }
  }

  return (
    <section className="card" aria-labelledby="titulo-nuevo">
      <h2 id="titulo-nuevo">Nuevo cliente</h2>
      <form className="form-grid" onSubmit={enviar} noValidate>
        <label>
          RUC
          <input
            name="ruc"
            inputMode="numeric"
            maxLength={13}
            placeholder="1799999910001"
            required
            value={valores.ruc}
            onChange={cambiar('ruc')}
            onBlur={() => setTocadoRuc(true)}
            aria-invalid={errorRuc ? true : undefined}
            aria-describedby={errorRuc ? 'error-ruc' : undefined}
          />
          {errorRuc && <span id="error-ruc" className="error">{errorRuc}</span>}
        </label>
        <label>
          Razón social
          <input name="razon_social" required minLength={3} value={valores.razon_social} onChange={cambiar('razon_social')} />
        </label>
        <label>
          Email
          <input name="email" type="email" placeholder="opcional" value={valores.email} onChange={cambiar('email')} />
        </label>
        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? 'Creando…' : 'Crear cliente'}
        </button>
      </form>
      <p className="hint">Al crear un cliente se generan sus obligaciones del último mes cerrado.</p>
    </section>
  );
}
