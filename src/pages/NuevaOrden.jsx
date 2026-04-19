import { useState } from 'react'
import { db } from '../lib/db'
import { generarFolio } from '../lib/utils'
import { ArrowLeft, MapPin } from 'lucide-react'

const OEMS = ['Terex', 'SkyJack', 'LGMG', 'Otro']
const TIPOS_SERVICIO = ['Correctivo', 'Garantía Deutz', 'Inspección', 'Seguimiento']

export default function NuevaOrden({ onBack, onCreada }) {
  const [form, setForm] = useState({
    cliente_nombre: '',
    contacto: '',
    ubicacion: '',
    oem: '',
    tipo_servicio: '',
    observaciones: '',
    numero_os: '',
  })
  const [gps, setGps] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const obtenerGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Este navegador no soporta GPS')
      return
    }
    setGpsLoading(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        if (err.code === 1) setGpsError('Permiso denegado — activa la ubicación en tu navegador')
        else if (err.code === 2) setGpsError('No se pudo obtener la ubicación. Escribe la dirección manualmente')
        else setGpsError('Tiempo agotado. Intenta de nuevo o escribe la dirección')
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    )
  }

  const validar = () => {
    const e = {}
    if (!form.cliente_nombre.trim()) e.cliente_nombre = 'Requerido'
    if (!form.ubicacion.trim()) e.ubicacion = 'Requerido'
    if (!form.oem) e.oem = 'Requerido'
    if (!form.tipo_servicio) e.tipo_servicio = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    const folio = generarFolio()
    const now = new Date().toISOString()
    const id = await db.ordenes.add({
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
      estatus: 'Nueva',
      sync_pendiente: true,
      created_at: now,
      updated_at: now,
    })
    setSaving(false)
    onCreada(id)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-[#AA0000] text-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg active:bg-red-900">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold">Nueva orden</h1>
          <p className="text-red-200 text-xs">Datos generales</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-24">

        {/* Número OS */}
        <section className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Referencia interna</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Número de OS <span className="text-gray-400 font-normal">(ERP interno)</span></label>
            <input
              type="number"
              value={form.numero_os}
              onChange={e => set('numero_os', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
              placeholder="Ej. 10842"
              min="1"
            />
          </div>
        </section>

        {/* Cliente */}
        <section className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Cliente</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nombre del cliente <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.cliente_nombre}
                onChange={(e) => set('cliente_nombre', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] ${errors.cliente_nombre ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Ej. Constructora ABC"
              />
              {errors.cliente_nombre && <p className="text-red-500 text-xs mt-1">{errors.cliente_nombre}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del contacto</label>
              <input
                type="text"
                value={form.contacto}
                onChange={(e) => set('contacto', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000]"
                placeholder="Ej. Juan Pérez"
              />
            </div>
          </div>
        </section>

        {/* Ubicación */}
        <section className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Ubicación</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Dirección o descripción del lugar <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.ubicacion}
                onChange={(e) => set('ubicacion', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] ${errors.ubicacion ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Ej. Obra Torre Sur, Col. Centro, CDMX"
              />
              {errors.ubicacion && <p className="text-red-500 text-xs mt-1">{errors.ubicacion}</p>}
            </div>

            <button
              type="button"
              onClick={obtenerGPS}
              className={`flex items-center gap-2 text-sm font-medium active:opacity-70 ${gps ? 'text-green-600' : 'text-[#AA0000]'}`}
            >
              <MapPin size={16} />
              {gpsLoading ? 'Obteniendo GPS...' : gps ? `✓ GPS: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : 'Capturar coordenadas GPS'}
            </button>
            {gpsError && (
              <p className="text-xs text-orange-600 mt-1">{gpsError}</p>
            )}
          </div>
        </section>

        {/* Tipo de servicio */}
        <section className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Servicio</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                OEM <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {OEMS.map(oem => (
                  <button
                    key={oem}
                    type="button"
                    onClick={() => set('oem', oem)}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.oem === oem ? 'bg-[#AA0000] text-white border-[#AA0000]' : 'bg-white text-gray-700 border-gray-200'}`}
                  >
                    {oem}
                  </button>
                ))}
              </div>
              {errors.oem && <p className="text-red-500 text-xs mt-1">{errors.oem}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de servicio <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {TIPOS_SERVICIO.map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => set('tipo_servicio', tipo)}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium border text-left px-4 transition-colors ${form.tipo_servicio === tipo ? 'bg-[#AA0000] text-white border-[#AA0000]' : 'bg-white text-gray-700 border-gray-200'}`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
              {errors.tipo_servicio && <p className="text-red-500 text-xs mt-1">{errors.tipo_servicio}</p>}
            </div>
          </div>
        </section>

        {/* Observaciones */}
        <section className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Observaciones iniciales</h2>
          <textarea
            value={form.observaciones}
            onChange={(e) => set('observaciones', e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] resize-none"
            placeholder="Describe brevemente el motivo del servicio..."
          />
        </section>
      </div>

      {/* Botón flotante */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <button
          onClick={guardar}
          disabled={saving}
          className="w-full max-w-lg mx-auto block bg-[#AA0000] text-white py-4 rounded-2xl font-medium disabled:opacity-60 active:scale-95 transition-transform"
        >
          {saving ? 'Guardando...' : 'Crear orden y continuar'}
        </button>
      </div>
    </div>
  )
}
