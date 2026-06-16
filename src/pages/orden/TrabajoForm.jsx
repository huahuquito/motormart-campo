import { useState, useEffect } from 'react'
import { db } from '../../lib/db'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

export default function TrabajoForm({ orden, initialData, initialPartes, onBack, onGuardado }) {
  const [trabajo, setTrabajo] = useState('')
  const [partes, setPartes] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    db.cierres.where('orden_id').equals(orden.id).first().then(c => {
      if (c?.trabajo_realizado) setTrabajo(c.trabajo_realizado)
      else if (initialData?.trabajo_realizado) setTrabajo(initialData.trabajo_realizado)
    })
    db.partes.where('orden_id').equals(orden.id).toArray().then(ps => {
      if (ps.length) setPartes(ps)
      else if (initialPartes?.length) setPartes(initialPartes)
    })
  }, [orden.id])

  const agregarParte = () => {
    setPartes(prev => [...prev, { numero_parte: '', descripcion: '', cantidad: 1, _nuevo: true }])
  }

  const actualizarParte = (idx, campo, valor) => {
    setPartes(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p))
  }

  const eliminarParte = (idx) => {
    setPartes(prev => prev.filter((_, i) => i !== idx))
  }

  const validar = () => {
    const e = {}
    if (!trabajo.trim()) e.trabajo = 'Describe el trabajo realizado'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    const now = new Date().toISOString()

    // Guardar trabajo en cierre parcial
    const existente = await db.cierres.where('orden_id').equals(orden.id).first()
    if (existente) {
      await db.cierres.update(existente.id, { trabajo_realizado: trabajo, sync_pendiente: true, updated_at: now })
    } else {
      await db.cierres.add({ orden_id: orden.id, trabajo_realizado: trabajo, sync_pendiente: true, created_at: now, updated_at: now })
    }

    // Guardar partes (eliminar anteriores y reinsertar)
    await db.partes.where('orden_id').equals(orden.id).delete()
    for (const parte of partes) {
      if (parte.numero_parte.trim() || parte.descripcion.trim()) {
        const { _nuevo, id, ...data } = parte
        await db.partes.add({ ...data, orden_id: orden.id, sync_pendiente: true, created_at: now })
      }
    }

    setSaving(false)
    onGuardado()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#AA0000] text-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg active:bg-red-900">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold">Trabajo realizado</h1>
          <p className="text-red-200 text-xs">{orden.folio}</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-24 space-y-4">

        {/* Trabajo */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Descripción del trabajo</h2>
          <textarea
            rows={5}
            value={trabajo}
            onChange={e => setTrabajo(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none ${errors.trabajo ? 'border-red-400' : 'border-gray-200'}`}
            placeholder="Describe detalladamente las actividades realizadas, ajustes, componentes inspeccionados y reemplazados..."
          />
          {errors.trabajo && <p className="text-red-500 text-xs mt-1">{errors.trabajo}</p>}
        </section>

        {/* Partes */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 text-sm">Partes utilizadas</h2>
            <button onClick={agregarParte}
              className="flex items-center gap-1 text-xs text-[#AA0000] font-medium active:opacity-70">
              <Plus size={14} /> Agregar
            </button>
          </div>

          {partes.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-4">No se agregaron partes todavía</p>
          ) : (
            <div className="space-y-3">
              {partes.map((parte, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={parte.numero_parte}
                      onChange={e => actualizarParte(idx, 'numero_parte', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
                      placeholder="Número de parte"
                    />
                    <input
                      type="text"
                      value={parte.descripcion}
                      onChange={e => actualizarParte(idx, 'descripcion', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
                      placeholder="Descripción"
                    />
                    <input
                      type="number"
                      value={parte.cantidad}
                      onChange={e => actualizarParte(idx, 'cantidad', parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-24 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
                      placeholder="Cant."
                    />
                  </div>
                  <button onClick={() => eliminarParte(idx)} className="p-2 text-red-400 active:opacity-70 mt-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <button onClick={guardar} disabled={saving}
          className="w-full max-w-lg mx-auto block bg-[#AA0000] text-white py-4 rounded-2xl font-medium disabled:opacity-60 active:scale-95 transition-transform">
          {saving ? 'Guardando...' : 'Guardar trabajo'}
        </button>
      </div>
    </div>
  )
}
