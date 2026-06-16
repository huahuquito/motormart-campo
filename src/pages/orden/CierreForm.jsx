import { useState, useEffect, useRef } from 'react'
import { db } from '../../lib/db'
import { ArrowLeft, RotateCcw, CheckCircle, Mail } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'

const RESULTADOS = [
  { id: 'operativo', label: 'Equipo operativo', color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'operativo_recomendaciones', label: 'Operativo con recomendaciones', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { id: 'pendiente_partes', label: 'Pendiente de partes', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'fuera_servicio', label: 'Fuera de servicio', color: 'bg-red-50 text-red-700 border-red-200' },
]

export default function CierreForm({ orden, initialData, onBack, onCerrada }) {
  const [form, setForm] = useState({ resultado: '', conclusion: '', recomendaciones: '', nombre_contacto: '', email_contacto: '' })
  const [sinFirma, setSinFirma] = useState(false)
  const [justificacion, setJustificacion] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const sigRef = useRef(null)

  useEffect(() => {
    db.cierres.where('orden_id').equals(orden.id).first().then(c => {
      const src = c || initialData
      if (!src) return
      setForm(prev => ({
        ...prev,
        resultado:        src.resultado        || '',
        conclusion:       src.conclusion       || '',
        recomendaciones:  src.recomendaciones  || '',
        nombre_contacto:  src.nombre_contacto  || '',
        email_contacto:   src.email_contacto   || '',
      }))
    })
  }, [orden.id])

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const limpiarFirma = () => sigRef.current?.clear()

  const validar = () => {
    const e = {}
    if (!form.resultado) e.resultado = 'Selecciona el resultado'
    if (!form.conclusion.trim()) e.conclusion = 'Requerido'
    if (!form.nombre_contacto.trim()) e.nombre_contacto = 'Requerido'
    if (form.email_contacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_contacto)) e.email_contacto = 'Correo inválido'
    if (!sinFirma && sigRef.current?.isEmpty()) e.firma = 'Firma requerida o indica por qué no firmó'
    if (sinFirma && !justificacion.trim()) e.justificacion = 'Explica por qué no se obtuvo firma'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    const now = new Date().toISOString()

    // Capturar firma con fondo blanco para que html2canvas la capture correctamente
    let firmaDataUrl = null
    if (!sinFirma && sigRef.current) {
      const sigCanvas = sigRef.current.getCanvas()
      const tmpCanvas = document.createElement('canvas')
      tmpCanvas.width  = sigCanvas.width
      tmpCanvas.height = sigCanvas.height
      const ctx = tmpCanvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height)
      ctx.drawImage(sigCanvas, 0, 0)
      firmaDataUrl = tmpCanvas.toDataURL('image/png')
    }

    const existente = await db.cierres.where('orden_id').equals(orden.id).first()
    const dataCierre = {
      ...form,
      firma_data: firmaDataUrl,
      sin_firma: sinFirma,
      justificacion_sin_firma: sinFirma ? justificacion : null,
      sync_pendiente: true,
      updated_at: now,
    }

    if (existente) {
      await db.cierres.update(existente.id, dataCierre)
    } else {
      await db.cierres.add({ ...dataCierre, orden_id: orden.id, created_at: now })
    }

    // Cambiar estatus de la orden a cerrada técnica
    await db.ordenes.update(orden.id, { estatus: 'Cerrada técnica', sync_pendiente: true, updated_at: now })

    setSaving(false)
    onCerrada(form.email_contacto.trim() || null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#AA0000] text-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg active:bg-red-900">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold">Cierre y firma</h1>
          <p className="text-red-200 text-xs">{orden.folio}</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-24 space-y-4">

        {/* Resultado */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Resultado del servicio <span className="text-red-500">*</span></h2>
          <div className="space-y-2">
            {RESULTADOS.map(r => (
              <button key={r.id} onClick={() => set('resultado', r.id)}
                className={`w-full py-3 px-4 rounded-xl text-sm font-medium border text-left transition-colors ${form.resultado === r.id ? r.color + ' border-current' : 'bg-white text-gray-700 border-gray-200'}`}>
                {r.label}
              </button>
            ))}
          </div>
          {errors.resultado && <p className="text-red-500 text-xs mt-2">{errors.resultado}</p>}
        </section>

        {/* Conclusión */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Conclusión técnica <span className="text-red-500">*</span>
            </label>
            <textarea rows={3} value={form.conclusion} onChange={e => set('conclusion', e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none ${errors.conclusion ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="Resumen técnico del resultado del servicio..." />
            {errors.conclusion && <p className="text-red-500 text-xs mt-1">{errors.conclusion}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Recomendaciones</label>
            <textarea rows={2} value={form.recomendaciones} onChange={e => set('recomendaciones', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none"
              placeholder="Acciones preventivas o correctivas sugeridas al cliente..." />
          </div>
        </section>

        {/* Firma */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Conformidad del cliente</h2>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre del contacto que recibe <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.nombre_contacto} onChange={e => set('nombre_contacto', e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] ${errors.nombre_contacto ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="Nombre completo del contacto" />
            {errors.nombre_contacto && <p className="text-red-500 text-xs mt-1">{errors.nombre_contacto}</p>}
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Mail size={12} className="text-gray-400" />
              Correo electrónico del contacto
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input type="email" value={form.email_contacto} onChange={e => set('email_contacto', e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] ${errors.email_contacto ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="contacto@empresa.com" />
            {errors.email_contacto
              ? <p className="text-red-500 text-xs mt-1">{errors.email_contacto}</p>
              : form.email_contacto && !errors.email_contacto
                ? <p className="text-blue-500 text-xs mt-1">El reporte se enviará automáticamente a este correo al cerrar.</p>
                : null
            }
          </div>

          {/* Toggle sin firma */}
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={sinFirma} onChange={e => setSinFirma(e.target.checked)} className="w-4 h-4 accent-[#AA0000]" />
            <span className="text-xs text-gray-600">El cliente no puede firmar</span>
          </label>

          {sinFirma ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Justificación <span className="text-red-500">*</span>
              </label>
              <textarea rows={2} value={justificacion} onChange={e => setJustificacion(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none ${errors.justificacion ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Ej. El cliente no se encontraba en el sitio al momento del cierre..." />
              {errors.justificacion && <p className="text-red-500 text-xs mt-1">{errors.justificacion}</p>}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Firma digital <span className="text-red-500">*</span></label>
                <button onClick={limpiarFirma} className="flex items-center gap-1 text-xs text-gray-400 active:opacity-70">
                  <RotateCcw size={12} /> Borrar
                </button>
              </div>
              <div className={`rounded-xl border-2 overflow-hidden ${errors.firma ? 'border-red-400' : 'border-gray-200'}`}>
                <SignatureCanvas
                  ref={sigRef}
                  penColor="#1a1a1a"
                  canvasProps={{ className: 'w-full h-36 bg-gray-50', style: { touchAction: 'none' } }}
                />
              </div>
              {errors.firma && <p className="text-red-500 text-xs mt-1">{errors.firma}</p>}
              <p className="text-xs text-gray-400 mt-1 text-center">Firma con el dedo en el área gris</p>
            </div>
          )}
        </section>

        {/* Aviso final */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-xs text-yellow-800">
          Al cerrar esta orden, el estatus cambia a <strong>Cerrada técnica</strong>. Asegúrate de que toda la información esté completa antes de continuar.
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <button onClick={guardar} disabled={saving}
          className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 bg-[#AA0000] text-white py-4 rounded-2xl font-medium disabled:opacity-60 active:scale-95 transition-transform">
          <CheckCircle size={18} />
          {saving ? 'Cerrando...' : 'Cerrar orden'}
        </button>
      </div>
    </div>
  )
}
