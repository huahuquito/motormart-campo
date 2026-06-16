import { useState, useEffect } from 'react'
import { db } from '../../lib/db'
import { ArrowLeft, Camera } from 'lucide-react'
import { comprimirImagenBase64 } from '../../lib/utils'

export default function EquipoForm({ orden, initialData, initialFotos, onBack, onGuardado }) {
  const [form, setForm] = useState({
    marca_motor: '', modelo_motor: '', serie_motor: '',
    horas_motor: '', modelo_maquina: '', serie_maquina: '',
  })
  const [fotoPlacaMotor, setFotoPlacaMotor] = useState(null)   // base64
  const [fotoPlacaMaquina, setFotoPlacaMaquina] = useState(null) // base64
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const esGarantia = orden.tipo_servicio === 'Garantía Deutz'

  useEffect(() => {
    db.equipos_orden.where('orden_id').equals(orden.id).first().then(eq => {
      if (eq) {
        setForm(f => ({ ...f, ...eq }))
      } else if (initialData) {
        setForm(f => ({
          ...f,
          marca_motor: initialData.marca_motor || '',
          modelo_motor: initialData.modelo_motor || '',
          serie_motor: initialData.serie_motor || '',
          horas_motor: initialData.horas_motor || '',
          modelo_maquina: initialData.modelo_maquina || '',
          serie_maquina: initialData.serie_maquina || '',
        }))
      }
    })
    db.evidencia.where('orden_id').equals(orden.id).toArray().then(evs => {
      const m = evs.find(e => e.categoria === 'placa_motor')
      const mq = evs.find(e => e.categoria === 'placa_maquina')
      if (m?.ruta_local) setFotoPlacaMotor(m.ruta_local)
      else if (initialFotos?.motor) setFotoPlacaMotor(initialFotos.motor)
      if (mq?.ruta_local) setFotoPlacaMaquina(mq.ruta_local)
      else if (initialFotos?.maquina) setFotoPlacaMaquina(initialFotos.maquina)
    })
  }, [orden.id])

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const validar = () => {
    const e = {}
    if (!form.serie_motor.trim()) e.serie_motor = 'Requerido'
    if (!form.horas_motor) e.horas_motor = 'Requerido'
    if (esGarantia && !fotoPlacaMotor) e.fotoPlacaMotor = 'Obligatoria para garantía'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Guarda como base64 — persiste en IndexedDB entre navegaciones
  const capturarFoto = async (e, setter) => {
    const file = e.target.files[0]
    if (!file) return
    const base64 = await comprimirImagenBase64(file)
    setter(base64)
    e.target.value = ''
  }

  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    const now = new Date().toISOString()

    // Guardar datos del equipo
    const existente = await db.equipos_orden.where('orden_id').equals(orden.id).first()
    if (existente) {
      await db.equipos_orden.update(existente.id, { ...form, sync_pendiente: true, updated_at: now })
    } else {
      await db.equipos_orden.add({ ...form, orden_id: orden.id, sync_pendiente: true, created_at: now, updated_at: now })
    }

    // Solo guardar foto si es nueva captura local (base64), no URL remota de Supabase
    if (fotoPlacaMotor && fotoPlacaMotor.startsWith('data:')) {
      const existe = await db.evidencia.where('orden_id').equals(orden.id)
        .and(e => e.categoria === 'placa_motor').first()
      if (existe) {
        await db.evidencia.update(existe.id, { ruta_local: fotoPlacaMotor, sync_pendiente: true })
      } else {
        await db.evidencia.add({
          orden_id: orden.id, tipo: 'foto', categoria: 'placa_motor',
          ruta_local: fotoPlacaMotor, sync_pendiente: true, created_at: now
        })
      }
    }

    if (fotoPlacaMaquina && fotoPlacaMaquina.startsWith('data:')) {
      const existe = await db.evidencia.where('orden_id').equals(orden.id)
        .and(e => e.categoria === 'placa_maquina').first()
      if (existe) {
        await db.evidencia.update(existe.id, { ruta_local: fotoPlacaMaquina, sync_pendiente: true })
      } else {
        await db.evidencia.add({
          orden_id: orden.id, tipo: 'foto', categoria: 'placa_maquina',
          ruta_local: fotoPlacaMaquina, sync_pendiente: true, created_at: now
        })
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
          <h1 className="text-lg font-bold">Identificación del equipo</h1>
          <p className="text-red-200 text-xs">{orden.folio}</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-24 space-y-4">

        {/* Motor */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Motor Deutz</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marca motor</label>
              <input type="text" value={form.marca_motor} onChange={e => set('marca_motor', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
                placeholder="Ej. Deutz" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modelo motor</label>
              <input type="text" value={form.modelo_motor} onChange={e => set('modelo_motor', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
                placeholder="Ej. TCD 2.9 L4" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Número de serie motor <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.serie_motor} onChange={e => set('serie_motor', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] ${errors.serie_motor ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Ej. 12345678" />
              {errors.serie_motor && <p className="text-red-500 text-xs mt-1">{errors.serie_motor}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Horas del motor <span className="text-red-500">*</span>
              </label>
              <input type="number" value={form.horas_motor} onChange={e => set('horas_motor', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] ${errors.horas_motor ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Ej. 1250" />
              {errors.horas_motor && <p className="text-red-500 text-xs mt-1">{errors.horas_motor}</p>}
            </div>

            {/* Foto placa motor */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Foto de placa motor {esGarantia && <span className="text-red-500">* (obligatoria en garantía)</span>}
              </label>
              {fotoPlacaMotor ? (
                <div className="relative">
                  <img src={fotoPlacaMotor} alt="Placa motor" className="w-full h-32 object-cover rounded-xl" />
                  <button onClick={() => setFotoPlacaMotor(null)}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed cursor-pointer active:bg-gray-50 ${errors.fotoPlacaMotor ? 'border-red-400' : 'border-gray-200'}`}>
                  <Camera size={24} className="text-gray-300 mb-1" />
                  <span className="text-xs text-gray-400">Toca para tomar foto</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => capturarFoto(e, setFotoPlacaMotor)} />
                </label>
              )}
              {errors.fotoPlacaMotor && <p className="text-red-500 text-xs mt-1">{errors.fotoPlacaMotor}</p>}
            </div>
          </div>
        </section>

        {/* Máquina */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Máquina / Equipo</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modelo de la máquina</label>
              <input type="text" value={form.modelo_maquina} onChange={e => set('modelo_maquina', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
                placeholder="Ej. Terex AWP-36S" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Número de serie máquina</label>
              <input type="text" value={form.serie_maquina} onChange={e => set('serie_maquina', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
                placeholder="Ej. A-98765" />
            </div>

            {/* Foto placa máquina */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Foto de placa máquina {esGarantia && <span className="text-red-500">* (obligatoria en garantía)</span>}
              </label>
              {fotoPlacaMaquina ? (
                <div className="relative">
                  <img src={fotoPlacaMaquina} alt="Placa máquina" className="w-full h-32 object-cover rounded-xl" />
                  <button onClick={() => setFotoPlacaMaquina(null)}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer active:bg-gray-50">
                  <Camera size={24} className="text-gray-300 mb-1" />
                  <span className="text-xs text-gray-400">Toca para tomar foto</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => capturarFoto(e, setFotoPlacaMaquina)} />
                </label>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <button onClick={guardar} disabled={saving}
          className="w-full max-w-lg mx-auto block bg-[#AA0000] text-white py-4 rounded-2xl font-medium disabled:opacity-60 active:scale-95 transition-transform">
          {saving ? 'Guardando...' : 'Guardar equipo'}
        </button>
      </div>
    </div>
  )
}
