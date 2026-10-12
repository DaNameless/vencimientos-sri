import type { EstadoObligacion, Obligacion } from '../api/client';
import { ETIQUETA_ESTADO, textoDias } from '../utils/formato';

export type Filtro = EstadoObligacion | '';

interface Props {
  obligaciones: Obligacion[];
  filtro: Filtro;
  onFiltroChange: (filtro: Filtro) => void;
  onPresentar: (id: number) => void;
  /** Ids con una petición en curso: su botón queda deshabilitado (evita doble clic). */
  enCurso: ReadonlySet<number>;
}

export function ObligacionesTabla({ obligaciones, filtro, onFiltroChange, onPresentar, enCurso }: Props) {
  return (
    <section className="card" aria-labelledby="titulo-obligaciones">
      <div className="card-head">
        <h2 id="titulo-obligaciones">Obligaciones</h2>
        <label className="sr-only" htmlFor="filtro-estado">Filtrar por estado</label>
        <select
          id="filtro-estado"
          value={filtro}
          onChange={(e) => onFiltroChange(e.target.value as Filtro)}
        >
          <option value="">Todas</option>
          <option value="vencida">Vencidas</option>
          <option value="pendiente">Por vencer</option>
          <option value="presentada">Presentadas</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Vence</th>
              <th scope="col">Cliente</th>
              <th scope="col">Tipo</th>
              <th scope="col">Período</th>
              <th scope="col">Estado</th>
              <th scope="col"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {obligaciones.length === 0 ? (
              <tr>
                <td colSpan={6} className="vacio">No hay obligaciones con ese filtro.</td>
              </tr>
            ) : (
              obligaciones.map((o) => (
                <tr key={o.id}>
                  <td className="nowrap">
                    {o.fecha_vencimiento}
                    <small>{textoDias(o.dias_restantes, o.estado)}</small>
                  </td>
                  <td>{o.razon_social}</td>
                  <td title={o.tipo_nombre}>{o.tipo}</td>
                  <td className="mono">{o.periodo}</td>
                  <td>
                    <span className={`badge badge--${o.estado}`}>{ETIQUETA_ESTADO[o.estado]}</span>
                  </td>
                  <td>
                    {o.estado !== 'presentada' && (
                      <button
                        type="button"
                        className="btn btn--small"
                        disabled={enCurso.has(o.id)}
                        aria-label={`Marcar como presentada: ${o.tipo} ${o.periodo} de ${o.razon_social}`}
                        onClick={() => onPresentar(o.id)}
                      >
                        Marcar presentada
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
