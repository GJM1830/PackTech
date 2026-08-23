import { generarPDFCotizacion } from './GenerarPDFCotizacion'

const formatearFecha = (fecha) => {
  if (!fecha) return '—'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

function VistaCotizacion({ orden, onCerrar }) {
  const simbolo = orden.moneda === 'Dólares' ? '$' : 'S/'

  const Fila = ({ label, valor }) => (
    <div className="flex justify-between py-1.5 border-b border-slate-100 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{valor || '—'}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Vista previa — {orden.codigo}</h3>
            <p className="text-sm text-slate-500">Esto es lo que se enviará al cliente.</p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <div className="bg-slate-900 text-white rounded-lg px-4 py-3 mb-5 flex justify-between items-center">
          <span className="font-bold tracking-tight">PACKTECH</span>
          <div className="text-right text-sm">
            <p className="text-slate-400">PEDIDO {orden.codigo}</p>
            <p className="text-slate-400">{formatearFecha(orden.fecha)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-5">
          <div>
            <Fila label="Cliente" valor={orden.cliente} />
            <Fila label="RUC / DNI" valor={orden.ruc} />
            <Fila label="Dirección de entrega" valor={orden.direccion_entrega} />
            <Fila label="N° de contacto" valor={orden.numero_contacto} />
            <Fila label="Email" valor={orden.email_cliente} />
          </div>
          <div>
            <Fila label="Moneda" valor={orden.moneda} />
            <Fila label="Vendedor" valor={orden.vendedor} />
            <Fila label="Fecha de entrega" valor={formatearFecha(orden.fecha_entrega)} />
            {orden.millares && <Fila label="Millares de referencia" valor={orden.millares} />}
          </div>
        </div>

        <div className="overflow-x-auto bg-slate-50 rounded-lg border border-slate-100 mb-5">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-2">Cant.</th>
                <th className="px-4 py-2">Unidad</th>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Precio Unit.</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-2">{orden.cantidad}</td>
                <td className="px-4 py-2">{orden.unidad}</td>
                <td className="px-4 py-2">{orden.descripcion || '—'}</td>
                <td className="px-4 py-2">
                  {orden.precio_unitario ? `${simbolo} ${orden.precio_unitario} / ${orden.unidad_precio}` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-slate-900 text-white rounded-lg px-4 py-3 flex justify-between items-center mb-6">
          <span className="text-sm text-slate-300">Total</span>
          <span className="text-xl font-bold">
            {orden.costo_total ? `${simbolo} ${Number(orden.costo_total).toFixed(2)}` : '—'}
          </span>
        </div>

        <div className="flex gap-3">
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
  )
}

export default VistaCotizacion