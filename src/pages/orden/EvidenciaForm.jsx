import { useState, useEffect } from 'react'
import { db } from '../../lib/db'
import { ArrowLeft, Camera, X } from 'lucide-react'
import { comprimirImagenBase64 } from '../../lib/utils'

const CATEGORIAS = [
  { id: 'antes', label: 'Antes del trabajo' },
  { id: 'durante', label: 'Durante el trabajo' },
  { id: 'despues', label: 'Después del trabajo' },
  { id: 'falla', label: 'Evidencia de la falla' },
]

export default function EvidenciaForm({ orden, onBack, onGuardado }) {
  const [fotos, setFotos] = useState({ antes: [], durante: [], despues: [], falla: [] })
  const [categoriaActiva, setCategoriaActiva] = useState('antes')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    db.evidencia.where('orden_id').equals(orden.id).toArray().then(ev => {
      const agrupadas = { antes: [], durante: [], despues: [], falla: [] }
      ev.forEach(e => {
        if (agrupadas[e.categoria]) agrupadas[e.categoria].push(e.ruta_local)
      })
      setFotos(agrupadas)
    })
  }, [orden.id])

  const agregarFoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const base64 = await comprimirImagenBase64(file)
    setFotos(prev => ({ ...prev, [categoriaActiva]: [...prev[categoriaActiva], base64] }))
    e.target.value = ''
  }

  const eliminarFoto = (categoria, idx) => {
    setFotos(prev => ({ ...prev, [categoria]: prev[categoria].filter((_, i) => i !== idx) }))
  }

  const validar = () => {
    const totalFotos = Object.values(fotos).flat().length
    if (totalFotos === 0) {
      setErrors({ general: 'Agrega al menos una foto de evidencia' })
      return false
    }
    setErrors({})
    return true
  }

  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    const now = new Date().toISOString()

    // Limpiar evidencias anteriores de esta orden y agregar las nuevas
    await db.evidencia.where('orden_id').equals(orden.id)
      .and(e => ['antes', 'durante', 'despues', 'falla'].includes(e.categoria))
      .delete()

    for (const [categoria, urls] of Object.entries(fotos)) {
      for (const url of urls) {
        await db.evidencia.add({
          orden_id: orden.id, tipo: 'foto', categoria,
          ruta_local: url, sync_pendiente: true, created_at: now
        })
      }
    }

    setSaving(false)
    onGuardado()
  }

  const totalFotos = Object.values(fotos).flat().length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#AA0000] text-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg active:bg-red-900">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold">Evidencia fotográfica</h1>
          <p className="text-red-200 text-xs">{orden.folio} · {totalFotos} foto{totalFotos !== 1 ? 's' : ''}</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-24">

        {/* Selector de categoría */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {CATEGORIAS.map(cat => (
            <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoriaActiva === cat.id ? 'bg-[#AA0000] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {cat.label} {fotos[cat.id].length > 0 && `(${fotos[cat.id].length})`}
            </button>
          ))}
        </div>

        {errors.general && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{errors.general}</div>
        )}

        {/* Grid de fotos */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {fotos[categoriaActiva].map((url, idx) => (
            <div key={idx} className="relative aspect-square">
              <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />
              <button onClick={() => eliminarFoto(categoriaActiva, idx)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Botón agregar foto */}
          <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer active:bg-gray-50">
            <Camera size={24} className="text-gray-300 mb-1" />
            <span className="text-xs text-gray-400">Agregar</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={agregarFoto} />
          </label>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Las fotos se comprimen automáticamente para ahorrar espacio
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <button onClick={guardar} disabled={saving}
          className="w-full max-w-lg mx-auto block bg-[#AA0000] text-white py-4 rounded-2xl font-medium disabled:opacity-60 active:scale-95 transition-transform">
          {saving ? 'Guardando...' : `Guardar evidencia (${totalFotos} foto${totalFotos !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  )
}
