import { generarPDFCotizacion } from './GenerarPDFCotizacion'

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const RUC_EMPRESA = '20554000755'
const ETIQUETA_UNIDAD_PRECIO = { millares: 'millares', unidades: 'unidades', rollos: 'rollos', kg: 'kg' }

function VistaCotizacion({ orden: pedido, onCerrar }) {
  const items = pedido.items || [{
    descripcion: pedido.descripcion, medidas: pedido.medidas, cantidad: pedido.cantidad,
    moneda: pedido.moneda, precio_unitario: pedido.precio_unitario, unidad_precio: pedido.unidad_precio,
    cantidad_precio: pedido.cantidad_precio, costo_total: pedido.costo_total
  }]
  const simbolo = items[0]?.moneda === 'Dólares' ? '$' : 'S/'
  const subtotal = items.reduce((s, it) => s + (it.costo_total || 0), 0)
  const igv = pedido.incluye_igv ? subtotal * 0.18 : 0
  const total = subtotal + igv

  const Celda = ({ label, valor, borde = true }) => (
    <div className={`px-3 py-1.5 ${borde ? 'border-b border-black' : ''}`}>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800">{valor || '-'}</p>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Vista previa de pedido</h3>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <div className="p-5">
          <div className="border border-black rounded-md overflow-hidden text-slate-800">
            {/* Encabezado */}
            <div className="flex items-center justify-between border-b border-black px-4 py-3">
              <div>
                <img src="/logo-packtech.png" alt="PackTech" className="h-10" />
                <p className="text-[10px] text-slate-500 mt-1">RUC: {RUC_EMPRESA}</p>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Pedido</p>
                  <p className="text-sm font-bold text-slate-900">{pedido.codigo_base || pedido.codigo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Fecha</p>
                  <p className="text-sm font-bold text-slate-900">{formatearFecha(pedido.fecha)}</p>
                </div>
              </div>
            </div>

            {/* Cliente / Comercial */}
            <div className="grid grid-cols-2 divide-x divide-black border-b border-black">
              <div className="divide-y divide-black">
                <Celda label="Cliente" valor={pedido.cliente} />
                <Celda label="RUC / DNI" valor={pedido.ruc} />
                <Celda label="Dirección de entrega" valor={pedido.direccion_entrega} />
                <Celda label="N° de contacto" valor={pedido.numero_contacto} borde={false} />
              </div>
              <div className="divide-y divide-black">
                <Celda label="Vendedor" valor={pedido.vendedor} />
                <Celda label="Fecha de entrega" valor={formatearFecha(pedido.fecha_entrega)} />
                <Celda label="Email" valor={pedido.email_cliente} borde={false} />
              </div>
            </div>

            {/* Tabla de productos */}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-indigo-100 text-slate-800 text-[10px] uppercase">
                  <th className="px-2 py-1.5 text-left font-semibold">Cant.</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Unidad</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Descripción</th>
                  <th className="px-2 py-1.5 text-left font-semibold">P. Unitario</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const cant = it.unidad_precio && it.unidad_precio !== 'kg' ? it.cantidad_precio : it.cantidad
                  const unidad = ETIQUETA_UNIDAD_PRECIO[it.unidad_precio] || 'kg'
                  const simboloItem = it.moneda === 'Dólares' ? '$' : 'S/'
                  return (
                    <tr key={i} className="border-t border-black">
                      <td className="px-2 py-2">{cant || '-'}</td>
                      <td className="px-2 py-2">{unidad}</td>
                      <td className="px-2 py-2">
                        {it.descripcion || '-'}
                        {it.medidas && (
                          <div className="text-xs text-slate-500">Medidas: {it.medidas}</div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {it.precio_unitario ? `${simboloItem} ${it.precio_unitario}` : '-'}
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {it.costo_total ? `${simboloItem} ${Number(it.costo_total).toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {(pedido.incluye_igv != null || pedido.observaciones_pedido) && (
              <div className="px-3 py-2 border-t border-black">
                <p className="text-xs text-slate-600">
                  {pedido.incluye_igv ? 'Precio incluye IGV' : 'Precio no incluye IGV'}
                </p>
                {pedido.observaciones_pedido && (
                  <p className="text-sm text-slate-700 mt-1">Obs: {pedido.observaciones_pedido}</p>
                )}
              </div>
            )}

            {/* Totales */}
            <div className="flex justify-end border-t border-black">
              <div className="w-56">
                <div className="flex justify-between px-4 py-1.5 border-b border-black text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-800">{simbolo} {subtotal.toFixed(2)}</span>
                </div>
                {pedido.incluye_igv && (
                  <div className="flex justify-between px-4 py-1.5 border-b border-black text-sm">
                    <span className="text-slate-500">IGV (18%)</span>
                    <span className="text-slate-800">{simbolo} {igv.toFixed(2)}</span>
                  </div>
                )}
                <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-slate-300">Total</span>
                  <span className="font-bold">{simbolo} {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {pedido.imagen_url && (
            <div className="mt-5 flex justify-center">
              <img src={pedido.imagen_url} alt="Imagen del pedido" className="max-h-64 rounded-lg border border-slate-200" />
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={onCerrar}
              className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
            <button
              onClick={() => generarPDFCotizacion(pedido)}
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