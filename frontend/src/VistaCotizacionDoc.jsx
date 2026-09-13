import { generarPDFCotizacionDoc } from './GenerarPDFCotizacionDoc'

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

function VistaCotizacionDoc({ cotizacion, onCerrar }) {
  const simbolo = cotizacion.moneda === 'Dólares' ? '$' : 'S/'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Cotización {cotizacion.codigo}</h3>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-400 uppercase">Cliente</p>
              <p className="font-medium text-slate-800">{cotizacion.cliente}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-400 uppercase">Fecha</p>
              <p className="font-medium text-slate-800">{formatearFecha(cotizacion.fecha)}</p>
            </div>
            {cotizacion.vendedor && (
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-400 uppercase">Vendedor</p>
                <p className="font-medium text-slate-800">{cotizacion.vendedor}</p>
              </div>
            )}
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-400 uppercase">Moneda</p>
              <p className="font-medium text-slate-800">{cotizacion.moneda || '-'} {cotizacion.incluye_igv ? '· Con IGV' : '· Sin IGV'}</p>
            </div>
          </div>

          <div className="space-y-2">
            {cotizacion.items.map((it, i) => (
              <div key={i} className="border border-slate-200 rounded-lg px-3 py-2">
                <p className="font-medium text-slate-800 text-sm">{it.descripcion || 'Sin descripción'}</p>
                {it.medidas && <p className="text-xs text-slate-500">Medidas: {it.medidas}</p>}
                {it.procesos_plan && (
                  <p className="text-xs text-blue-700">Ruta: {it.procesos_plan.split(',').join(' → ')}</p>
                )}
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">{it.cantidad} {it.unidad}</span>
                  <span className="font-medium text-slate-800">
                    {it.costo_total ? `${simbolo} ${Number(it.costo_total).toFixed(2)}` : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-800">{simbolo} {Number(cotizacion.subtotal || 0).toFixed(2)}</span>
            </div>
            {cotizacion.incluye_igv && (
              <div className="flex justify-between">
                <span className="text-slate-500">IGV (18%)</span>
                <span className="text-slate-800">{simbolo} {Number(cotizacion.igv || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between bg-slate-900 text-white rounded-lg px-3 py-2 font-bold">
              <span>Total</span>
              <span>{simbolo} {Number(cotizacion.total || 0).toFixed(2)}</span>
            </div>
          </div>

          {(cotizacion.forma_pago || cotizacion.tiempo_entrega || cotizacion.validez_oferta) && (
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs space-y-0.5">
              {cotizacion.forma_pago && <p><span className="font-semibold text-slate-600">Forma de pago:</span> {cotizacion.forma_pago}</p>}
              {cotizacion.tiempo_entrega && <p><span className="font-semibold text-slate-600">Tiempo de entrega:</span> {cotizacion.tiempo_entrega}</p>}
              {cotizacion.validez_oferta && <p><span className="font-semibold text-slate-600">Validez de la oferta:</span> {cotizacion.validez_oferta}</p>}
            </div>
          )}

          {cotizacion.observaciones && (
            <p className="text-xs text-slate-500">Obs: {cotizacion.observaciones}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCerrar}
              className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
            <button
              onClick={() => generarPDFCotizacionDoc(cotizacion)}
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

export default VistaCotizacionDoc