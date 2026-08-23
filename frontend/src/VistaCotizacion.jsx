import { generarPDFCotizacion } from './GenerarPDFCotizacion'

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

function VistaCotizacion({ orden, onCerrar }) {
  const simbolo = orden.moneda === 'Dólares' ? '$' : 'S/'

  const Celda = ({ label, valor, borde = true }) => (
    <div className={`px-3 py-1.5 ${borde ? 'border-b border-slate-200' : ''}`}>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800">{valor || '-'}</p>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Vista previa de cotización</h3>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <div className="p-5">
          <div className="border border-slate-800 rounded-md overflow-hidden text-slate-800">
            {/* Encabezado */}
            <div className="grid grid-cols-2 border-b border-slate-800">
              <div className="px-3 py-2 border-r border-slate-800">
                <p className="text-blue-800 font-bold text-lg leading-none">PACKTECH</p>
                <p className="text-[10px] text-slate-500 mt-0.5">S.A.C.</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-800">
                <div className="px-3 py-2 border-b border-slate-800 col-span-2 grid grid-cols-2 divide-x divide-slate-800">
                  <div className="px-0 py-0">
                    <p className="text-[10px] text-slate-500">PEDIDO</p>
                    <p className="text-sm font-bold">{orden.codigo}</p>
                  </div>
                  <div className="px-3">
                    <p className="text-[10px] text-slate-500">FECHA</p>
                    <p className="text-sm font-bold">{formatearFecha(orden.fecha)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cliente / Comercial */}
            <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-800">
              <div className="divide-y divide-slate-200">
                <Celda label="Cliente" valor={orden.cliente} />
                <Celda label="RUC / DNI" valor={orden.ruc} />
                <Celda label="Dirección de entrega" valor={orden.direccion_entrega} />
                <Celda label="N° de contacto" valor={orden.numero_contacto} borde={false} />
              </div>
              <div className="divide-y divide-slate-200">
                <Celda label="Moneda" valor={orden.moneda} />
                <Celda label="Vendedor" valor={orden.vendedor} />
                <Celda label="Fecha de entrega" valor={formatearFecha(orden.fecha_entrega)} />
                <Celda label="Email" valor={orden.email_cliente} borde={false} />
              </div>
            </div>

            {/* Tabla de producto */}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px] uppercase">
                  <th className="px-2 py-1.5 text-left font-semibold">Cant.</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Unidad</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Descripción</th>
                  <th className="px-2 py-1.5 text-left font-semibold">P. Unit.</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="px-2 py-2">{orden.cantidad}</td>
                  <td className="px-2 py-2">{orden.unidad}</td>
                  <td className="px-2 py-2">{orden.descripcion || '-'}</td>
                  <td className="px-2 py-2">
                    {orden.precio_unitario ? `${simbolo} ${orden.precio_unitario}/${orden.unidad_precio}` : '-'}
                  </td>
                  <td className="px-2 py-2 text-right font-medium">
                    {orden.costo_total ? `${simbolo} ${Number(orden.costo_total).toFixed(2)}` : '-'}
                  </td>
                </tr>
                {orden.millares && (
                  <tr className="border-t border-slate-100">
                    <td colSpan={5} className="px-2 py-1.5 text-xs text-slate-500">
                      Millares de referencia: {orden.millares}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Total */}
            <div className="flex justify-end border-t border-slate-800">
              <div className="bg-slate-900 text-white px-4 py-2 flex items-center gap-4">
                <span className="text-xs uppercase tracking-wide text-slate-300">Total</span>
                <span className="font-bold">
                  {orden.costo_total ? `${simbolo} ${Number(orden.costo_total).toFixed(2)}` : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={onCerrar}
              className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
            <button
              onClick={() => generarPDFCotizacion(orden)}
              className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 font-medium hover:bg-blue-800"
            >
              ⬇ Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VistaCotizacion