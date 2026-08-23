import { generarPDFCotizacion } from './GenerarPDFCotizacion'

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

function VistaCotizacion({ orden, onCerrar }) {
  const simbolo = orden.moneda === 'Dólares' ? '$' : 'S/'
  const cantidadTabla = orden.unidad_precio === 'millares' ? orden.millares : orden.cantidad
  const unidadTabla = orden.unidad_precio === 'millares' ? 'millares' : orden.unidad

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
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <img src="/logo-packtech.png" alt="PackTech" className="h-10" />
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Pedido</p>
                  <p className="text-sm font-bold text-slate-900">{orden.codigo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Fecha</p>
                  <p className="text-sm font-bold text-slate-900">{formatearFecha(orden.fecha)}</p>
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
                  <td className="px-2 py-2">{cantidadTabla || '-'}</td>
                  <td className="px-2 py-2">{unidadTabla}</td>
                  <td className="px-2 py-2">{orden.descripcion || '-'}</td>
                  <td className="px-2 py-2">
                    {orden.precio_unitario ? `${simbolo} ${orden.precio_unitario}/${orden.unidad_precio}` : '-'}
                  </td>
                  <td className="px-2 py-2 text-right font-medium">
                    {orden.costo_total ? `${simbolo} ${Number(orden.costo_total).toFixed(2)}` : '-'}
                  </td>
                </tr>
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