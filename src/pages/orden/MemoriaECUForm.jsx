import { useState, useEffect } from 'react'
import { db } from '../../lib/db'
import { supabase } from '../../lib/supabase'
import { useOnline } from '../../hooks/useOnline'
import { comprimirImagen, comprimirImagenBase64 } from '../../lib/utils'
import { ArrowLeft, Camera, FileUp, CheckCircle, XCircle, X, ExternalLink, Info } from 'lucide-react'

// Sube un archivo a Supabase Storage y retorna la URL pública firmada
async function subirArchivo(blob, path, tipo) {
  const { data, error } = await supabase.storage
    .from('motormart')
    .upload(path, blob, { contentType: tipo, upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('motormart').getPublicUrl(path)
  return urlData.publicUrl
}

function SeccionMemoria({ label, tipo, datos, onChange, isOnline, ordenFolio }) {
  const [subiendo, setSubiendo] = useState(false)

  const capturarFoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Guardar como base64 para que persista en IndexedDB al navegar
    const base64 = await comprimirImagenBase64(file)
    onChange(`${tipo}_foto_local`, base64)

    if (isOnline) {
      setSubiendo(true)
      try {
        const comprimida = await comprimirImagen(file)
        const path = `${ordenFolio}/${tipo}_foto_${Date.now()}.jpg`
        const urlRemota = await subirArchivo(comprimida, path, 'image/jpeg')
        onChange(`${tipo}_foto_url`, urlRemota)
      } catch {
        // base64 local ya guardado, se subirá al sincronizar
      }
      setSubiendo(false)
    }
    e.target.value = ''
  }

  const cargarPDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    onChange(`${tipo}_pdf_nombre`, file.name)

    if (isOnline) {
      setSubiendo(true)
      try {
        const path = `${ordenFolio}/${tipo}_${Date.now()}.pdf`
        const urlRemota = await subirArchivo(file, path, 'application/pdf')
        onChange(`${tipo}_pdf_url`, urlRemota)
        onChange(`${tipo}_pdf_blob`, null)
      } catch {
        // Guardar blob localmente si falla la subida
        const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' })
        onChange(`${tipo}_pdf_blob`, blob)
      }
      setSubiendo(false)
    } else {
      const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' })
      onChange(`${tipo}_pdf_blob`, blob)
    }
    e.target.value = ''
  }

  // Preferir base64 local para mostrar en pantalla (no depende de permisos del bucket)
  const fotoUrl = datos[`${tipo}_foto_local`] || datos[`${tipo}_foto_url`]
  const pdfUrl = datos[`${tipo}_pdf_url`]
  const pdfNombre = datos[`${tipo}_pdf_nombre`]
  const descargada = datos[`${tipo}_descargada`]

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-3">
<div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-sm">{label}</h3>
        {/* Toggle "se descargó" */}
        <button
          type="button"
          onClick={() => onChange(`${tipo}_descargada`, !descargada)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${descargada ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
        >
          {descargada ? <CheckCircle size={13} /> : <XCircle size={13} />}
          {descargada ? 'Descargada' : 'No descargada'}
        </button>
      </div>

      {descargada && (
        <>
          {/* Foto de la pantalla de la memoria */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Foto de la pantalla ({label})
            </label>
            {fotoUrl ? (
              <div className="relative">
                <img src={fotoUrl} alt={label} className="w-full h-32 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => { onChange(`${tipo}_foto_url`, null); onChange(`${tipo}_foto_local`, null) }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  <X size={12} />
                </button>
                {datos[`${tipo}_foto_url`] && (
                  <span className="absolute bottom-2 left-2 bg-green-600/80 text-white text-xs px-2 py-0.5 rounded-full">Subida</span>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer active:bg-gray-50">
                <Camera size={22} className="text-gray-300 mb-1" />
                <span className="text-xs text-gray-400">Foto de la pantalla</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={capturarFoto} />
              </label>
            )}
          </div>

          {/* PDF de la memoria */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Archivo PDF de la {label}
            </label>
            {pdfNombre ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <FileUp size={16} className="text-blue-500 shrink-0" />
                <span className="text-xs text-blue-700 flex-1 truncate">{pdfNombre}</span>
                {pdfUrl ? (
                  <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-blue-600 shrink-0">
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="text-xs text-yellow-600 shrink-0">● Pendiente</span>
                )}
                <button type="button" onClick={() => { onChange(`${tipo}_pdf_nombre`, null); onChange(`${tipo}_pdf_url`, null); onChange(`${tipo}_pdf_blob`, null) }}>
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 h-12 rounded-xl border-2 border-dashed border-gray-200 px-4 cursor-pointer active:bg-gray-50">
                <FileUp size={18} className="text-gray-300" />
                <span className="text-xs text-gray-400">Seleccionar PDF de la {label}</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={cargarPDF} />
              </label>
            )}
            {pdfUrl && (
              <p className="text-xs text-green-600 mt-1">✓ Subido a storage — se incluirá en el reporte</p>
            )}
            {!pdfUrl && pdfNombre && (
              <p className="text-xs text-yellow-600 mt-1">Se subirá al sincronizar con internet</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones de la {label}</label>
            <textarea
              rows={2}
              value={datos[`${tipo}_notas`] || ''}
              onChange={e => onChange(`${tipo}_notas`, e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none"
              placeholder={tipo === 'mem1' ? 'Códigos activos encontrados, observaciones...' : 'Códigos históricos relevantes, observaciones...'}
            />
          </div>
        </>
      )}

      {subiendo && (
        <p className="text-xs text-blue-600 animate-pulse">Subiendo archivo...</p>
      )}
    </div>
  )
}

export default function MemoriaECUForm({ orden, initialData, onBack, onGuardado }) {
  const isOnline = useOnline()
  const [aplica, setAplica] = useState(true)
  const [herramienta, setHerramienta] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [mems, setMems] = useState({
    mem1_descargada: false, mem1_foto_url: null, mem1_foto_local: null,
    mem1_pdf_url: null, mem1_pdf_nombre: null, mem1_pdf_blob: null, mem1_notas: '',
    mem2_descargada: false, mem2_foto_url: null, mem2_foto_local: null,
    mem2_pdf_url: null, mem2_pdf_nombre: null, mem2_pdf_blob: null, mem2_notas: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    db.memorias_ecu.where('orden_id').equals(orden.id).first().then(m => {
      const src = m || initialData
      if (!src) return
      setAplica(src.aplica ?? true)
      setHerramienta(src.herramienta || '')
      setComentarios(src.comentarios || '')
      setMems({
        mem1_descargada:  src.mem1_descargada  ?? false,
        mem1_foto_local:  src.mem1_foto_local  || null,
        mem1_foto_url:    src.mem1_foto_url    || null,
        mem1_pdf_url:     src.mem1_pdf_url     || null,
        mem1_pdf_nombre:  src.mem1_pdf_nombre  || null,
        mem1_pdf_blob:    null,
        mem1_notas:       src.mem1_notas       || '',
        mem2_descargada:  src.mem2_descargada  ?? false,
        mem2_foto_local:  src.mem2_foto_local  || null,
        mem2_foto_url:    src.mem2_foto_url    || null,
        mem2_pdf_url:     src.mem2_pdf_url     || null,
        mem2_pdf_nombre:  src.mem2_pdf_nombre  || null,
        mem2_pdf_blob:    null,
        mem2_notas:       src.mem2_notas       || '',
      })
    })
  }, [orden.id])

  const onChange = (campo, valor) => setMems(prev => ({ ...prev, [campo]: valor }))

  const guardar = async () => {
    setSaving(true)
    try {
      const now = new Date().toISOString()

      // Solo guardar campos conocidos — evitar spreads de objetos Dexie
      // que pueden traer campos no serializables o IDs conflictivos
      const registro = {
        orden_id:         orden.id,
        aplica,
        herramienta,
        comentarios,
        mem1_descargada:  mems.mem1_descargada,
        mem1_foto_local:  mems.mem1_foto_local  || null,
        mem1_foto_url:    mems.mem1_foto_url    || null,
        mem1_pdf_url:     mems.mem1_pdf_url     || null,
        mem1_pdf_nombre:  mems.mem1_pdf_nombre  || null,
        mem1_notas:       mems.mem1_notas       || '',
        mem2_descargada:  mems.mem2_descargada,
        mem2_foto_local:  mems.mem2_foto_local  || null,
        mem2_foto_url:    mems.mem2_foto_url    || null,
        mem2_pdf_url:     mems.mem2_pdf_url     || null,
        mem2_pdf_nombre:  mems.mem2_pdf_nombre  || null,
        mem2_notas:       mems.mem2_notas       || '',
        sync_pendiente:   true,
        updated_at:       now,
      }

      const existente = await db.memorias_ecu.where('orden_id').equals(orden.id).first()
      if (existente) {
        await db.memorias_ecu.update(existente.id, registro)
      } else {
        await db.memorias_ecu.add({ ...registro, created_at: now })
      }

      onGuardado()
    } catch (err) {
      console.error('Error guardando memorias ECU:', err)
      alert('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#AA0000] text-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg active:bg-red-900">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold">Diagnóstico electrónico</h1>
          <p className="text-red-200 text-xs">Memorias ECU · {orden.folio}</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-24 space-y-4">

        {/* Explicación */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex gap-2 text-xs text-blue-700">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div>
            <p><strong>Mem1</strong> — Códigos activos que tiene el motor en este momento.</p>
            <p className="mt-0.5"><strong>Mem2</strong> — Historial de códigos que el motor ha tenido a lo largo de su vida.</p>
          </div>
        </div>

        {/* ¿Aplica? */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Diagnóstico electrónico</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAplica(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${aplica ? 'bg-[#AA0000] text-white border-[#AA0000]' : 'bg-white text-gray-600 border-gray-200'}`}>
              Sí aplica
            </button>
            <button type="button" onClick={() => setAplica(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${!aplica ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-200'}`}>
              No aplica
            </button>
          </div>

          {!aplica && (
            <p className="text-xs text-gray-400 mt-2 text-center">El motor no tiene ECU o no se contó con la herramienta de diagnóstico</p>
          )}
        </section>

        {aplica && (
          <>
            {/* Herramienta usada */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <label className="block text-xs font-medium text-gray-600 mb-1">Herramienta de diagnóstico utilizada</label>
              <input
                type="text"
                value={herramienta}
                onChange={e => setHerramienta(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
                placeholder="Ej. SERDIA 3, DEUTZ Diagnostic System, laptop + cable..."
              />
            </section>

            {/* Mem1 */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-orange-700">M1</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Memoria 1 (Mem1)</p>
                  <p className="text-xs text-gray-400">Códigos de falla activos</p>
                </div>
              </div>
              <SeccionMemoria
                label="Mem1"
                tipo="mem1"
                datos={mems}
                onChange={onChange}
                isOnline={isOnline}
                ordenFolio={orden.folio}
              />
            </section>

            {/* Mem2 */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-700">M2</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Memoria 2 (Mem2)</p>
                  <p className="text-xs text-gray-400">Historial de códigos del motor</p>
                </div>
              </div>
              <SeccionMemoria
                label="Mem2"
                tipo="mem2"
                datos={mems}
                onChange={onChange}
                isOnline={isOnline}
                ordenFolio={orden.folio}
              />
            </section>

            {/* Comentarios generales */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <label className="block text-xs font-medium text-gray-600 mb-1">Comentarios generales del diagnóstico electrónico</label>
              <textarea
                rows={3}
                value={comentarios}
                onChange={e => setComentarios(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none"
                placeholder="Observaciones generales, interpretación de los códigos, acciones tomadas..."
              />
            </section>

            {!isOnline && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 text-xs text-yellow-800">
                Sin conexión — las fotos y PDFs se guardarán localmente y se subirán al recuperar señal.
              </div>
            )}
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <button onClick={guardar} disabled={saving}
          className="w-full max-w-lg mx-auto block bg-[#AA0000] text-white py-4 rounded-2xl font-medium disabled:opacity-60 active:scale-95 transition-transform">
          {saving ? 'Guardando...' : 'Guardar diagnóstico electrónico'}
        </button>
      </div>
    </div>
  )
}
