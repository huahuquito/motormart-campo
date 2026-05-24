import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOnline } from '../hooks/useOnline'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { sincronizar, contarPendientes } from '../lib/sync'
import { formatFecha } from '../lib/utils'
import { LogoCompleto } from '../components/Logo'
import { Wifi, WifiOff, RefreshCw, LogOut, ClipboardList, CheckCircle, AlertCircle } from 'lucide-react'

const ESTATUS_COLOR = {
  'Nueva':               'bg-blue-100 text-blue-700',
  'Asignada':            'bg-yellow-100 text-yellow-800',
  'En camino':           'bg-orange-100 text-orange-700',
  'En sitio':            'bg-purple-100 text-purple-700',
  'Trabajo realizado':   'bg-teal-100 text-teal-700',
  'Cerrada técnica':     'bg-green-100 text-green-700',
  'Cerrada administrativa': 'bg-gray-100 text-gray-700',
}

const CERRADAS = ['Cerrada técnica', 'Cerrada administrativa']

function inicioPeriodo(periodo) {
  const hoy = new Date()
  if (periodo === 'semana') {
    const d = new Date(hoy)
    d.setDate(hoy.getDate() - hoy.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (periodo === 'mes') return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  if (periodo === 'anio') return new Date(hoy.getFullYear(), 0, 1)
  return null
}

export default function Dashboard({ onVerOrden, onAutoAbrir }) {
  const { user, perfil, signOut } = useAuth()
  const isOnline = useOnline()
  const [ordenes, setOrdenes] = useState([])
  const [pendientes, setPendientes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const [autoAbierta, setAutoAbierta] = useState(false)
  const [filtroEstatus, setFiltroEstatus] = useState('asignadas')
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes')

  const cargarOrdenes = useCallback(async () => {
    setLoading(true)

    if (isOnline && user) {
      const { data: remotas } = await supabase
        .from('ordenes')
        .select('*')
        .eq('tecnico_id', user.id)
        .order('created_at', { ascending: false })

      if (remotas) {
        for (const orden of remotas) {
          const existe = await db.ordenes.where('folio').equals(orden.folio).first()
          if (!existe) {
            await db.ordenes.add({
              folio: orden.folio,
              fecha_servicio: orden.fecha_servicio || orden.created_at,
              cliente_nombre: orden.cliente_nombre,
              contacto: orden.contacto,
              ubicacion: orden.ubicacion,
              gps_lat: orden.gps_lat,
              gps_lng: orden.gps_lng,
              oem: orden.oem,
              tipo_servicio: orden.tipo_servicio,
              observaciones: orden.observaciones,
              numero_os: orden.numero_os || null,
              estatus: orden.estatus,
              tecnico_id: orden.tecnico_id,
              tecnico_nombre: orden.tecnico_nombre,
              supabase_id: orden.id,
              sync_pendiente: false,
              created_at: orden.created_at,
              updated_at: orden.updated_at,
            })
          } else if (!existe.supabase_id) {
            await db.ordenes.update(existe.id, { supabase_id: orden.id })
          }
        }
      }
    }

    const todas = await db.ordenes.where('tecnico_id').equals(user.id).toArray()
    const ordenadas = todas.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    setOrdenes(ordenadas)
    const count = await contarPendientes()
    setPendientes(count)
    setLoading(false)

    if (!autoAbierta) {
      const asignadas = ordenadas.filter(o => o.estatus === 'Asignada')
      if (asignadas.length === 1) {
        setAutoAbierta(true)
        onAutoAbrir(asignadas[0].id)
      }
    }
  }, [isOnline, user, autoAbierta])

  useEffect(() => { cargarOrdenes() }, [])
  useEffect(() => { if (isOnline && pendientes > 0) handleSync() }, [isOnline])

  const handleSync = async () => {
    if (!isOnline || syncing) return
    setSyncing(true)
    try {
      const resultado = await sincronizar()
      if (resultado.errores === 0) {
        setSyncMsg({ tipo: 'ok', texto: `${resultado.ok} registros sincronizados` })
      } else {
        setSyncMsg({ tipo: 'error', texto: `${resultado.errores} errores al sincronizar` })
      }
      await cargarOrdenes()
    } catch (err) {
      console.error('Sync error:', err)
      setSyncMsg({ tipo: 'error', texto: 'Error de conexión. Intenta de nuevo.' })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 6000)
    }
  }

  const ordenesFiltradas = useMemo(() => {
    let resultado = ordenes

    if (filtroEstatus === 'asignadas') resultado = resultado.filter(o => !CERRADAS.includes(o.estatus))
    if (filtroEstatus === 'cerradas') resultado = resultado.filter(o => CERRADAS.includes(o.estatus))

    const desde = inicioPeriodo(filtroPeriodo)
    if (desde) resultado = resultado.filter(o => new Date(o.created_at) >= desde)

    return resultado
  }, [ordenes, filtroEstatus, filtroPeriodo])

  return (
    <div className="min-h-screen" style={{ background: '#f1f5f9' }}>

      <header style={{ background: 'linear-gradient(135deg, #0f2744, #1a3a5c)' }} className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <LogoCompleto className="text-white [&>div>div:first-child]:text-white [&>div>div:last-child]:text-blue-200" />
          <button onClick={signOut} className="p-2 rounded-xl text-blue-200 active:bg-white/10">
            <LogOut size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">{perfil?.nombre || user?.email}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wide">Técnico</p>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${isOnline ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'}`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? 'En línea' : 'Sin conexión'}
            </div>
            {pendientes > 0 && (
              <button onClick={isOnline ? handleSync : () => setSyncMsg({ tipo: 'error', texto: 'Sin conexión para sincronizar' })}
                disabled={syncing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-yellow-400/20 text-yellow-200 disabled:opacity-50">
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sync...' : `${pendientes} pendiente${pendientes > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>

        {syncMsg && (
          <div className={`mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full w-fit ${syncMsg.tipo === 'ok' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
            {syncMsg.tipo === 'ok' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {syncMsg.texto}
          </div>
        )}
      </header>

      {/* Filtro de período */}
      <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto">
        {[['semana', 'Esta semana'], ['mes', 'Este mes'], ['anio', 'Este año'], ['todas', 'Todas']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltroPeriodo(val)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtroPeriodo === val ? 'bg-[#0f2744] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filtro de estatus */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto">
        {[['asignadas', 'Asignadas'], ['cerradas', 'Cerradas'], ['todas', 'Todas']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltroEstatus(val)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtroEstatus === val ? 'text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}
            style={filtroEstatus === val ? { background: 'linear-gradient(135deg, #AA0000, #cc1111)' } : {}}>
            {label}
          </button>
        ))}
        <button onClick={cargarOrdenes} className="shrink-0 ml-auto p-1.5 bg-white rounded-full text-gray-400 border border-gray-200">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="px-4 pb-8 max-w-lg mx-auto">
        {!loading && (
          <p className="text-xs text-gray-400 mb-3 px-1">
            {ordenesFiltradas.length} orden{ordenesFiltradas.length !== 1 ? 'es' : ''}
          </p>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
        ) : ordenesFiltradas.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No hay órdenes en esta vista</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordenesFiltradas.map(orden => (
              <button key={orden.id} onClick={() => onVerOrden(orden.id)}
                className={`w-full bg-white rounded-2xl p-4 text-left shadow-sm border active:scale-95 transition-transform ${orden.estatus === 'Asignada' ? 'border-yellow-300 ring-1 ring-yellow-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{orden.folio}</p>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{orden.cliente_nombre}</p>
                    <p className="text-gray-400 text-xs mt-1">{formatFecha(orden.fecha_servicio)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTATUS_COLOR[orden.estatus] || 'bg-gray-100 text-gray-600'}`}>
                      {orden.estatus}
                    </span>
                    {orden.sync_pendiente
                      ? <span className="text-xs text-yellow-600 font-medium">● Sin sync</span>
                      : <span className="text-xs text-green-600">✓</span>}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {orden.tipo_servicio && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{orden.tipo_servicio}</span>}
                  {orden.oem && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{orden.oem}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
