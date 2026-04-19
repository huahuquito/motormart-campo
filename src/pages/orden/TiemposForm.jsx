import { useState, useEffect } from 'react'
import { db } from '../../lib/db'
import { ArrowLeft, Clock } from 'lucide-react'
import { formatHora } from '../../lib/utils'

function BtnTiempo({ label, valor, onCapturar }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {valor && <p className="text-xs text-gray-400 mt-0.5">{formatHora(valor)}</p>}
      </div>
      <button
        onClick={onCapturar}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${valor ? 'bg-green-50 text-green-700' : 'bg-[#AA0000] text-white active:scale-95'}`}
      >
        {valor ? 'Registrado' : 'Registrar ahora'}
      </button>
    </div>
  )
}

export default function TiemposForm({ orden, onBack, onGuardado }) {
  const [tiempos, setTiempos] = useState({
    hora_llegada: null,
    hora_inicio: null,
    hora_fin: null,
    hora_salida: null,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    db.tiempos.where('orden_id').equals(orden.id).first().then(t => {
      if (t) setTiempos(t)
    })
  }, [orden.id])

  const registrar = (campo) => {
    setTiempos(prev => ({ ...prev, [campo]: new Date().toISOString() }))
  }

  const guardar = async () => {
    setSaving(true)
    const now = new Date().toISOString()
    const existente = await db.tiempos.where('orden_id').equals(orden.id).first()
    if (existente) {
      await db.tiempos.update(existente.id, { ...tiempos, sync_pendiente: true, updated_at: now })
    } else {
      await db.tiempos.add({ ...tiempos, orden_id: orden.id, sync_pendiente: true, created_at: now, updated_at: now })
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
          <h1 className="text-lg font-bold">Registro de tiempos</h1>
          <p className="text-red-200 text-xs">{orden.folio}</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-24">
        <div className="bg-blue-50 text-blue-700 text-xs px-4 py-3 rounded-xl mb-4">
          Toca cada botón en el momento exacto. Los tiempos quedan registrados con sello automático.
        </div>

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-[#AA0000]" />
            <h2 className="font-semibold text-gray-800 text-sm">Tiempos del servicio</h2>
          </div>
          <BtnTiempo label="Llegada al sitio" valor={tiempos.hora_llegada} onCapturar={() => registrar('hora_llegada')} />
          <BtnTiempo label="Inicio del trabajo" valor={tiempos.hora_inicio} onCapturar={() => registrar('hora_inicio')} />
          <BtnTiempo label="Fin del trabajo" valor={tiempos.hora_fin} onCapturar={() => registrar('hora_fin')} />
          <BtnTiempo label="Salida del sitio" valor={tiempos.hora_salida} onCapturar={() => registrar('hora_salida')} />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <button onClick={guardar} disabled={saving}
          className="w-full max-w-lg mx-auto block bg-[#AA0000] text-white py-4 rounded-2xl font-medium disabled:opacity-60 active:scale-95 transition-transform">
          {saving ? 'Guardando...' : 'Guardar tiempos'}
        </button>
      </div>
    </div>
  )
}
