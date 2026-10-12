import type { ResumenCliente } from '../api/client';

interface Props {
  filas: ResumenCliente[];
}

export function ResumenClientes({ filas }: Props) {
  return (
    <section className="card" aria-labelledby="titulo-resumen">
      <h2 id="titulo-resumen">Resumen por cliente</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Cliente</th>
              <th scope="col">RUC</th>
              <th scope="col" className="num">Por vencer</th>
              <th scope="col" className="num">Vencidas</th>
              <th scope="col" className="num">Presentadas</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={5} className="vacio">Sin clientes.</td>
              </tr>
            ) : (
              filas.map((f) => (
                <tr key={f.cliente_id}>
                  <td>{f.razon_social}</td>
                  <td className="mono">{f.ruc}</td>
                  <td className="num">{f.por_vencer}</td>
                  <td className={`num ${f.vencidas > 0 ? 'alerta' : ''}`}>{f.vencidas}</td>
                  <td className="num">{f.presentadas}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
