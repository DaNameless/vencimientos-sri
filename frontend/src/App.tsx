import { useCallback, useEffect, useState } from 'react';

import { api, type ClienteIn, type Obligacion, type ResumenCliente } from './api/client';
import { GenerarPeriodoForm } from './components/GenerarPeriodoForm';
import { NuevoClienteForm } from './components/NuevoClienteForm';
import { ObligacionesTabla, type Filtro } from './components/ObligacionesTabla';
import { ResumenClientes } from './components/ResumenClientes';
import { useToast } from './hooks/useToast';

const mensaje = (e: unknown) => (e instanceof Error ? e.message : 'Error inesperado');

export default function App() {
  const [resumen, setResumen] = useState<ResumenCliente[]>([]);
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('');
  const [enCurso, setEnCurso] = useState<ReadonlySet<number>>(new Set());
  const { toast, mostrar } = useToast();

  const cargar = useCallback(async () => {
    try {
      const [r, o] = await Promise.all([api.resumen(), api.obligaciones(filtro || undefined)]);
      setResumen(r);
      setObligaciones(o);
    } catch (e) {
      mostrar(mensaje(e), 'error');
    }
  }, [filtro, mostrar]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function presentar(id: number) {
    setEnCurso((s) => new Set(s).add(id));
    try {
      await api.marcarPresentada(id);
      mostrar('Obligación marcada como presentada');
      await cargar();
    } catch (e) {
      mostrar(mensaje(e), 'error');
    } finally {
      setEnCurso((s) => {
        const copia = new Set(s);
        copia.delete(id);
        return copia;
      });
    }
  }

  async function crearCliente(datos: ClienteIn): Promise<boolean> {
    try {
      const c = await api.crearCliente(datos);
      mostrar(`Cliente creado con ${c.obligaciones_generadas} obligaciones`);
      await cargar();
      return true;
    } catch (e) {
      mostrar(mensaje(e), 'error');
      return false;
    }
  }

  async function generar(periodo: string) {
    try {
      const { creadas } = await api.generarPeriodo(periodo);
      mostrar(creadas ? `${creadas} obligaciones creadas para ${periodo}` : `El período ${periodo} ya estaba generado`);
      await cargar();
    } catch (e) {
      mostrar(mensaje(e), 'error');
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Vencimientos SRI</h1>
          <p className="topbar__sub">Obligaciones tributarias mensuales por cliente</p>
        </div>
        <GenerarPeriodoForm onGenerar={generar} />
      </header>

      <main className="layout">
        <ResumenClientes filas={resumen} />
        <ObligacionesTabla
          obligaciones={obligaciones}
          filtro={filtro}
          onFiltroChange={setFiltro}
          onPresentar={(id) => void presentar(id)}
          enCurso={enCurso}
        />
        <NuevoClienteForm onCrear={crearCliente} />
      </main>

      <div className={`toast ${toast ? `toast--visible toast--${toast.tipo}` : ''}`} role="status" aria-live="polite">
        {toast?.mensaje}
      </div>
    </>
  );
}
