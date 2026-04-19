import { useState, useEffect } from 'react'
import { db } from '../../lib/db'
import { ArrowLeft } from 'lucide-react'

export default function DiagnosticoForm({ orden, onBack, onGuardado }) {
  const [form, setForm] = useState({
    falla_reportada: '',
    sintomas: '',
    codigos: '',
    diag_preliminar: '',
    diag_final: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const esGarantia = orden.tipo_servicio === 'Garantía Deutz'

  useEffect(() => {
    db.diagnosticos.where('orden_id').equals(orden.id).first().then(d => {
      if (d) setForm(d)
    })
  }, [orden.id])

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const validar = () => {
    const e = {}
    if (!form.falla_reportada.trim()) e.falla_reportada = 'Requerido'
    if (!form.diag_final.trim()) e.diag_final = 'Requerido'
    if (esGarantia && !form.codigos.trim()) e.codigos = 'Obligatorio para garantía'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    const now = new Date().toISOString()
    const existente = await db.diagnosticos.where('orden_id').equals(orden.id).first()
    if (existente) {
      await db.diagnosticos.update(existente.id, { ...form, sync_pendiente: true, updated_at: now })
    } else {
      await db.diagnosticos.add({ ...form, orden_id: orden.id, sync_pendiente: true, created_at: now, updated_at: now })
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
          <h1 className="text-lg font-bold">Diagnóstico</h1>
          <p className="text-red-200 text-xs">{orden.folio}</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-24 space-y-4">
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Falla reportada <span className="text-red-500">*</span>
            </label>
            <textarea rows={3} value={form.falla_reportada} onChange={e => set('falla_reportada', e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none ${errors.falla_reportada ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="Describe la falla tal como la reportó el cliente..." />
            {errors.falla_reportada && <p className="text-red-500 text-xs mt-1">{errors.falla_reportada}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Síntomas observados</label>
            <textarea rows={3} value={form.sintomas} onChange={e => set('sintomas', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none"
              placeholder="Describe los síntomas que encontraste al inspeccionar..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Códigos de falla activos {esGarantia && <span className="text-red-500">* (obligatorio para garantía)</span>}
            </label>
            <input type="text" value={form.codigos} onChange={e => set('codigos', e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] ${errors.codigos ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="Ej. SPN 3251 FMI 18, SPN 100 FMI 4" />
            {errors.codigos && <p className="text-red-500 text-xs mt-1">{errors.codigos}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Diagnóstico preliminar</label>
            <textarea rows={2} value={form.diag_preliminar} onChange={e => set('diag_preliminar', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none"
              placeholder="Hipótesis inicial antes de la intervención..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Diagnóstico final <span className="text-red-500">*</span>
            </label>
            <textarea rows={3} value={form.diag_final} onChange={e => set('diag_final', e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none ${errors.diag_final ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="Diagnóstico confirmado después de la revisión..." />
            {errors.diag_final && <p className="text-red-500 text-xs mt-1">{errors.diag_final}</p>}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <button onClick={guardar} disabled={saving}
          className="w-full max-w-lg mx-auto block bg-[#AA0000] text-white py-4 rounded-2xl font-medium disabled:opacity-60 active:scale-95 transition-transform">
          {saving ? 'Guardando...' : 'Guardar diagnóstico'}
        </button>
      </div>
    </div>
  )
}
