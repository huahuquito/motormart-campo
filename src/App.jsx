import { useState, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { db } from './lib/db'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import NuevaOrdenAdmin from './pages/NuevaOrdenAdmin'
import OrdenDetalle from './pages/OrdenDetalle'
import ReportePreview from './pages/ReportePreview'
import { LogoIcon } from './components/Logo'

function Cargando() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #0f2744, #1a3a5c)' }}>
      <div className="text-center">
        <LogoIcon size={64} className="mx-auto mb-4" />
        <p className="text-blue-200 text-sm">Cargando...</p>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading, esAdmin } = useAuth()
  const [pantalla, setPantalla] = useState('inicio')
  const [ordenActiva, setOrdenActiva] = useState(null) // siempre es el ID local de IndexedDB
  const [autoEmail, setAutoEmail] = useState(null)

  // Garantiza que la orden esté en IndexedDB local y devuelve su ID local
  const resolverOrdenLocal = useCallback(async (ordenSupabase) => {
    // Si ya es un número, es un ID local directo
    if (typeof ordenSupabase === 'number') return ordenSupabase

    // Buscar por folio en IndexedDB
    const local = await db.ordenes.where('folio').equals(ordenSupabase.folio).first()
    if (local) {
      // Actualizar campos que pudieron agregarse después de la descarga inicial
      const actualizar = {}
      if (!local.supabase_id) actualizar.supabase_id = ordenSupabase.id
      if (local.numero_os == null && ordenSupabase.numero_os != null) actualizar.numero_os = ordenSupabase.numero_os
      if (Object.keys(actualizar).length > 0) await db.ordenes.update(local.id, actualizar)
      return local.id
    }

    // No existe localmente — guardar desde Supabase
    const id = await db.ordenes.add({
      folio:          ordenSupabase.folio,
      fecha_servicio: ordenSupabase.fecha_servicio || ordenSupabase.created_at,
      cliente_nombre: ordenSupabase.cliente_nombre,
      contacto:       ordenSupabase.contacto,
      ubicacion:      ordenSupabase.ubicacion,
      gps_lat:        ordenSupabase.gps_lat,
      gps_lng:        ordenSupabase.gps_lng,
      oem:            ordenSupabase.oem,
      tipo_servicio:  ordenSupabase.tipo_servicio,
      observaciones:  ordenSupabase.observaciones,
      numero_os:      ordenSupabase.numero_os || null,
      nci:            ordenSupabase.nci || null,
      estatus:        ordenSupabase.estatus,
      tecnico_id:     ordenSupabase.tecnico_id,
      tecnico_nombre: ordenSupabase.tecnico_nombre,
      creado_por:     ordenSupabase.creado_por,
      supabase_id:    ordenSupabase.id,
      sync_pendiente: false,
      created_at:     ordenSupabase.created_at,
      updated_at:     ordenSupabase.updated_at,
    })
    return id
  }, [])

  const irAOrden = useCallback(async (ordenOId) => {
    const id = await resolverOrdenLocal(ordenOId)
    setOrdenActiva(id)
    setPantalla('orden')
  }, [resolverOrdenLocal])

  const irAReporte = useCallback(async (ordenOId, email = null) => {
    const id = await resolverOrdenLocal(ordenOId)
    setOrdenActiva(id)
    setAutoEmail(email)
    setPantalla('reporte')
  }, [resolverOrdenLocal])

  // Early returns DESPUÉS de todos los hooks
  if (loading) return <Cargando />
  if (!user) return <Login />

  // Pantallas compartidas (admin y técnico)
  if (pantalla === 'orden' && ordenActiva) {
    return <OrdenDetalle ordenId={ordenActiva} onBack={() => setPantalla('inicio')} onVerReporte={irAReporte} />
  }
  if (pantalla === 'reporte' && ordenActiva) {
    return <ReportePreview ordenId={ordenActiva} onBack={() => { setAutoEmail(null); setPantalla('orden') }} autoEmail={autoEmail} />
  }

  // Flujo Administrador
  if (esAdmin) {
    if (pantalla === 'nueva-orden') {
      return <NuevaOrdenAdmin onBack={() => setPantalla('inicio')} onCreada={irAOrden} />
    }
    return (
      <AdminDashboard
        onNuevaOrden={() => setPantalla('nueva-orden')}
        onVerOrden={irAOrden}
      />
    )
  }

  // Flujo Técnico
  return (
    <Dashboard
      onVerOrden={irAOrden}
      onAutoAbrir={irAOrden}
    />
  )
}
