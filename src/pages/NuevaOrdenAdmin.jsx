import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeft, MapPin, UserCheck } from 'lucide-react'

const OEMS = ['Terex', 'SkyJack', 'LGMG', 'Otro']
const TIPOS = ['Correctivo', 'Garantía Deutz', 'Inspección', 'Seguimiento']

function generarFolio() {
  return `OS-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`
}

export default function NuevaOrdenAdmin({ onBack, onCreada }) {
  const { perfil } = useAuth()
  const [tecnicos, setTecnicos] = useState([])
  const [form, setForm] = useState({
    cliente_nombre: '', contacto: '', ubicacion: '',
    oem: '', tipo_servicio: '', observaciones: '', tecnico_id: '', tecnico_nombre: '',
    numero_os: '',
  })
  const [gps, setGps] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    supabase.from('perfiles').select('*').eq('rol', 'tecnico').eq('activo', true)
      .then(({ data }) => setTecnicos(data || []))
  }, [])

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const seleccionarTecnico = (t) => setForm(p => ({ ...p, tecnico_id: t.user_id, tecnico_nombre: t.nombre }))

  const obtenerGPS = () => {
    if (!navigator.geolocation) { setGpsError('GPS no disponible'); return }
    setGpsLoading(true); setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      pos => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false) },
      err => {
        setGpsLoading(false)
        if (err.code === 1) setGpsError('Permiso denegado — activa la ubicación')
        else setGpsError('No se pudo obtener el GPS. Escribe la dirección manualmente')
      },
      { timeout: 15000, enableHighAccuracy: true }
    )
  }

  const validar = () => {
    const e = {}
    if (!form.cliente_nombre.trim()) e.cliente_nombre = 'Requerido'
    if (!form.ubicacion.trim()) e.ubicacion = 'Requerido'
    if (!form.oem) e.oem = 'Requerido'
    if (!form.tipo_servicio) e.tipo_servicio = 'Requerido'
    if (!form.tecnico_id) e.tecnico = 'Asigna un técnico'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    const now = new Date().toISOString()
    const folio = generarFolio()

    const { data, error } = await supabase.from('ordenes').insert({
      folio,
      fecha_servicio: now,
      cliente_nombre: form.cliente_nombre.trim(),
      contacto: form.contacto.trim(),
      ubicacion: form.ubicacion.trim(),
      gps_lat: gps?.lat || null,
      gps_lng: gps?.lng || null,
      oem: form.oem,
      tipo_servicio: form.tipo_servicio,
      observaciones: form.observaciones.trim(),
      numero_os: form.numero_os ? parseInt(form.numero_os) : null,
      estatus: 'Asignada',
      tecnico_id: form.tecnico_id,
      tecnico_nombre: form.tecnico_nombre,
      creado_por: perfil?.nombre,
      created_at: now,
      updated_at: now,
    }).select().single()

    setSaving(false)
    if (error) {
      console.error('Error Supabase:', error)
      alert(`Error al crear la orden: ${error.message}`)
      return
    }
    if (data) onCreada(data)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header style={{ background: 'linear-gradient(135deg, #0f2744, #1a3a5c)' }} className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl text-blue-200 active:bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Nueva orden</h1>
          <p className="text-blue-300 text-xs">Datos generales y asignación</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-24 space-y-4">

        {/* Asignación de técnico */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck size={16} className="text-[#AA0000]" />
            <h2 className="font-semibold text-gray-800 text-sm">Técnico asignado <span className="text-red-500">*</span></h2>
          </div>
          {tecnicos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No hay técnicos registrados aún</p>
          ) : (
            <div className="space-y-2">
              {tecnicos.map(t => (
                <button key={t.user_id} type="button"
                  onClick={() => seleccionarTecnico(t)}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-medium border text-left transition-colors ${form.tecnico_id === t.user_id ? 'border-[#AA0000] bg-red-50 text-[#AA0000]' : 'border-gray-200 bg-white text-gray-700'}`}>
                  {t.nombre}
                  <span className="text-xs text-gray-400 ml-2">{t.email}</span>
                </button>
              ))}
            </div>
          )}
          {errors.tecnico && <p className="text-red-500 text-xs mt-2">{errors.tecnico}</p>}
        </section>

        {/* Número OS */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Referencia interna</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Número de OS <span className="text-gray-400 font-normal">(ERP interno)</span></label>
            <input type="number" value={form.numero_os} onChange={e => set('numero_os', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
              placeholder="Ej. 10842" min="1" />
          </div>
        </section>

        {/* Cliente */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Cliente</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del cliente <span className="text-red-500">*</span></label>
              <input type="text" value={form.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] ${errors.cliente_nombre ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Ej. Constructora ABC" />
              {errors.cliente_nombre && <p className="text-red-500 text-xs mt-1">{errors.cliente_nombre}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del contacto</label>
              <input type="text" value={form.contacto} onChange={e => set('contacto', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
                placeholder="Ej. Juan Pérez" />
            </div>
          </div>
        </section>

        {/* Ubicación */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Ubicación</h2>
          <div className="space-y-2">
            <input type="text" value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] ${errors.ubicacion ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="Dirección o descripción del lugar" />
            {errors.ubicacion && <p className="text-red-500 text-xs mt-1">{errors.ubicacion}</p>}
            <button type="button" onClick={obtenerGPS}
              className={`flex items-center gap-2 text-sm font-medium ${gps ? 'text-green-600' : 'text-[#AA0000]'}`}>
              <MapPin size={15} />
              {gpsLoading ? 'Obteniendo GPS...' : gps ? `✓ GPS: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : 'Capturar coordenadas GPS'}
            </button>
            {gpsError && <p className="text-xs text-orange-600">{gpsError}</p>}
          </div>
        </section>

        {/* Tipo de servicio */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">Servicio</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">OEM <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {OEMS.map(oem => (
                <button key={oem} type="button" onClick={() => set('oem', oem)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.oem === oem ? 'bg-[#AA0000] text-white border-[#AA0000]' : 'bg-white text-gray-700 border-gray-200'}`}>
                  {oem}
                </button>
              ))}
            </div>
            {errors.oem && <p className="text-red-500 text-xs mt-1">{errors.oem}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de servicio <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              {TIPOS.map(tipo => (
                <button key={tipo} type="button" onClick={() => set('tipo_servicio', tipo)}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium border text-left px-4 transition-colors ${form.tipo_servicio === tipo ? 'bg-[#AA0000] text-white border-[#AA0000]' : 'bg-white text-gray-700 border-gray-200'}`}>
                  {tipo}
                </button>
              ))}
            </div>
            {errors.tipo_servicio && <p className="text-red-500 text-xs mt-1">{errors.tipo_servicio}</p>}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-2 text-sm">Observaciones iniciales</h2>
          <textarea rows={3} value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none"
            placeholder="Motivo del servicio, urgencia, notas para el técnico..." />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <button onClick={guardar} disabled={saving}
          className="w-full max-w-lg mx-auto block py-4 rounded-2xl font-bold text-white disabled:opacity-60 active:scale-95 transition-transform"
          style={{ background: saving ? '#ccc' : 'linear-gradient(135deg, #AA0000, #cc1111)' }}>
          {saving ? 'Creando orden...' : 'Crear y asignar orden'}
        </button>
      </div>
    </div>
  )
}
