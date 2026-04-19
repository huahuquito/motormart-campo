import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { LogoCompleto } from '../components/Logo'
import { Plus, RefreshCw, LogOut, Users, ClipboardList, Search, X } from 'lucide-react'
import { formatFecha } from '../lib/utils'

const ESTATUS_COLOR = {
  'Nueva':               'bg-blue-100 text-blue-700',
  'Asignada':            'bg-yellow-100 text-yellow-700',
  'En camino':           'bg-orange-100 text-orange-700',
  'En sitio':            'bg-purple-100 text-purple-700',
  'Trabajo realizado':   'bg-teal-100 text-teal-700',
  'Cerrada técnica':     'bg-green-100 text-green-700',
  'Cerrada administrativa': 'bg-gray-100 text-gray-700',
}

function inicioPeriodo(periodo) {
  const hoy = new Date()
  if (periodo === 'semana') {
    const d = new Date(hoy)
    d.setDate(hoy.getDate() - hoy.getDay())
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (periodo === 'mes') {
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()
  }
  if (periodo === 'anio') {
    return new Date(hoy.getFullYear(), 0, 1).toISOString()
  }
  return null
}

export default function AdminDashboard({ onNuevaOrden, onVerOrden }) {
  const { perfil, signOut } = useAuth()
  const [ordenes, setOrdenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstatus, setFiltroEstatus] = useState('abiertas')
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes')
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('ordenes').select('*').order('created_at', { ascending: false })

    if (filtroEstatus === 'abiertas') q = q.not('estatus', 'in', '("Cerrada técnica","Cerrada administrativa")')
    if (filtroEstatus === 'cerradas') q = q.in('estatus', ['Cerrada técnica', 'Cerrada administrativa'])

    const desde = inicioPeriodo(filtroPeriodo)
    if (desde) q = q.gte('created_at', desde)

    const { data } = await q
    setOrdenes(data || [])
    setLoading(false)
  }, [filtroEstatus, filtroPeriodo])

  useEffect(() => { cargar() }, [cargar])

  const ordenesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return ordenes
    const texto = busqueda.toLowerCase().trim()
    return ordenes.filter(o =>
      o.folio?.toLowerCase().includes(texto) ||
      o.cliente_nombre?.toLowerCase().includes(texto) ||
      o.tecnico_nombre?.toLowerCase().includes(texto) ||
      o.ubicacion?.toLowerCase().includes(texto) ||
      o.oem?.toLowerCase().includes(texto) ||
      o.tipo_servicio?.toLowerCase().includes(texto) ||
      String(o.numero_os || '').includes(texto)
    )
  }, [ordenes, busqueda])

  return (
    <div className="min-h-screen" style={{ background: '#f1f5f9' }}>

      <header style={{ background: 'linear-gradient(135deg, #0f2744, #1a3a5c)' }} className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <LogoCompleto className="text-white [&>div>div:first-child]:text-white [&>div>div:last-child]:text-blue-200" />
          <button onClick={signOut} className="p-2 rounded-xl text-blue-200 active:bg-white/10">
            <LogOut size={20} />
          </button>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-semibold text-sm">{perfil?.nombre}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wide">Administrador</p>
          </div>
          <button
            onClick={onNuevaOrden}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white text-sm font-bold active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #AA0000, #cc1111)' }}
          >
            <Plus size={16} />
            Nueva orden
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, folio, técnico, OS..."
            className="w-full bg-white/10 text-white placeholder-blue-300 text-sm pl-9 pr-9 py-2.5 rounded-xl border border-white/20 focus:outline-none focus:bg-white/20"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300">
              <X size={15} />
            </button>
          )}
        </div>
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
        {[['todas', 'Todas'], ['abiertas', 'Abiertas'], ['cerradas', 'Cerradas']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltroEstatus(val)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtroEstatus === val ? 'text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}
            style={filtroEstatus === val ? { background: 'linear-gradient(135deg, #AA0000, #cc1111)' } : {}}>
            {label}
          </button>
        ))}
        <button onClick={cargar} className="shrink-0 ml-auto p-1.5 bg-white rounded-full text-gray-400 border border-gray-200">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="px-4 pb-8 max-w-lg mx-auto">
        {/* Contador */}
        {!loading && (
          <p className="text-xs text-gray-400 mb-3 px-1">
            {busqueda && ordenesFiltradas.length !== ordenes.length
              ? `${ordenesFiltradas.length} resultado${ordenesFiltradas.length !== 1 ? 's' : ''} de ${ordenes.length}`
              : `${ordenes.length} orden${ordenes.length !== 1 ? 'es' : ''}`}
          </p>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando órdenes...</div>
        ) : ordenesFiltradas.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">
              {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay órdenes en esta vista'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordenesFiltradas.map(orden => (
              <button key={orden.id} onClick={() => onVerOrden(orden)}
                className="w-full bg-white rounded-2xl p-4 text-left shadow-sm border border-gray-100 active:scale-95 transition-transform">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 text-sm">{orden.folio}</p>
                      {orden.numero_os && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-medium">OS {orden.numero_os}</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{orden.cliente_nombre}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Users size={11} className="text-gray-300" />
                      <p className="text-gray-400 text-xs">{orden.tecnico_nombre || 'Sin asignar'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTATUS_COLOR[orden.estatus] || 'bg-gray-100 text-gray-600'}`}>
                      {orden.estatus}
                    </span>
                    <span className="text-xs text-gray-400">{formatFecha(orden.fecha_servicio || orden.created_at)}</span>
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
