function ModalEditar({ titulo, campos, valores, onCambio, onGuardar, onCerrar, guardando }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{titulo}</h3>

        <div className="space-y-4">
          {campos.map((campo) => (
            <div key={campo.name}>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {campo.label}
              </label>
              <input
                type={campo.type || 'text'}
                value={valores[campo.name] ?? ''}
                onChange={(e) => onCambio(campo.name, e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCerrar}
            className="flex-1 border border-slate-300 rounded-lg py-2 font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={onGuardar}
            disabled={guardando}
            className="flex-1 bg-green-700 text-white rounded-lg py-2 font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalEditar