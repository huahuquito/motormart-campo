import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/db'
import { formatFecha } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeft, Wrench, Clock, FileText, Camera, PenLine, ChevronRight, CheckCircle, Cpu, FileDown, LogOut } from 'lucide-react'
import EquipoForm from './orden/EquipoForm'
import TiemposForm from './orden/TiemposForm'
import DiagnosticoForm from './orden/DiagnosticoForm'
import MemoriaECUForm from './orden/MemoriaECUForm'
import EvidenciaForm from './orden/EvidenciaForm'
import TrabajoForm from './orden/TrabajoForm'
import CierreForm from './orden/CierreForm'

const PASOS = [
  { id: 'equipo',      label: 'Identificación del equipo',  icon: Wrench,   desc: 'Motor, máquina y fotos de placa' },
  { id: 'tiempos',     label: 'Registro de tiempos',        icon: Clock,    desc: 'Llegada, trabajo y salida' },
  { id: 'diagnostico', label: 'Diagnóstico',                icon: FileText, desc: 'Falla, síntomas y diagnóstico final' },
  { id: 'memoria',     label: 'Diagnóstico electrónico',    icon: Cpu,      desc: 'Mem1 (activos) y Mem2 (históricos)' },
  { id: 'evidencia',   label: 'Evidencia fotográfica',      icon: Camera,   desc: 'Fotos antes, durante y después' },
  { id: 'trabajo',     label: 'Trabajo realizado',          icon: Wrench,   desc: 'Actividades y partes usadas' },
  { id: 'cierre',      label: 'Cierre y firma',             icon: PenLine,  desc: 'Resultado, conclusión y firma' },
]

export default function OrdenDetalle({ ordenId, onBack, onVerReporte }) {
  const { signOut } = useAuth()
  const [orden, setOrden] = useState(null)
  const [paso, setPaso] = useState(null)
  const [progreso, setProgreso] = useState({})

  const recargar = useCallback(() => db.ordenes.get(ordenId).then(setOrden), [ordenId])

  const cargarProgreso = useCallback(async () => {
    const [equipo, tiempos, diag, memoria, evidencia, cierre] = await Promise.all([
      db.equipos_orden.where('orden_id').equals(ordenId).first(),
      db.tiempos.where('orden_id').equals(ordenId).first(),
      db.diagnosticos.where('orden_id').equals(ordenId).first(),
      db.memorias_ecu.where('orden_id').equals(ordenId).first(),
      db.evidencia.where('orden_id').equals(ordenId).count(),
      db.cierres.where('orden_id').equals(ordenId).first(),
    ])
    setProgreso({
      equipo:      !!equipo,
      tiempos:     !!tiempos,
      diagnostico: !!(diag?.falla_reportada || diag?.diagnostico_final),
      memoria:     !!memoria,
      evidencia:   evidencia > 0,
      trabajo:     !!(cierre?.trabajo_realizado),
      cierre:      !!(cierre?.resultado),
    })
  }, [ordenId])

  useEffect(() => {
    recargar()
    cargarProgreso()
  }, [ordenId])

  const volverYActualizar = useCallback(() => {
    setPaso(null)
    recargar()
    cargarProgreso()
  }, [recargar, cargarProgreso])

  const handleCerrada = useCallback((email) => {
    setPaso(null)
    recargar()
    cargarProgreso()
    if (email) {
      setTimeout(() => onVerReporte(ordenId, email), 300)
    }
  }, [recargar, cargarProgreso, ordenId, onVerReporte])

  if (!orden) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  )

  const esCerrada = orden.estatus === 'Cerrada técnica' || orden.estatus === 'Cerrada administrativa'

  if (paso === 'equipo')       return <EquipoForm      orden={orden} onBack={volverYActualizar} onGuardado={volverYActualizar} />
  if (paso === 'tiempos')     return <TiemposForm     orden={orden} onBack={volverYActualizar} onGuardado={volverYActualizar} />
  if (paso === 'diagnostico') return <DiagnosticoForm orden={orden} onBack={volverYActualizar} onGuardado={volverYActualizar} />
  if (paso === 'memoria')     return <MemoriaECUForm  orden={orden} onBack={volverYActualizar} onGuardado={volverYActualizar} />
  if (paso === 'evidencia')   return <EvidenciaForm   orden={orden} onBack={volverYActualizar} onGuardado={volverYActualizar} />
  if (paso === 'trabajo')     return <TrabajoForm     orden={orden} onBack={volverYActualizar} onGuardado={volverYActualizar} />
  if (paso === 'cierre')      return <CierreForm      orden={orden} onBack={volverYActualizar} onCerrada={handleCerrada} />

  return (
    <div className="min-h-screen" style={{ background: '#f1f5f9' }}>
      <header style={{ background: 'linear-gradient(135deg, #0f2744, #1a3a5c)' }} className="text-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl text-blue-200 active:bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{orden.folio}</h1>
          <p className="text-blue-300 text-xs truncate">{orden.cliente_nombre}{orden.tecnico_nombre ? ` · ${orden.tecnico_nombre}` : ''}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${esCerrada ? 'bg-green-500/30 text-green-100' : 'bg-white/20 text-white'}`}>
          {orden.estatus}
        </span>
        <button onClick={signOut} className="p-2 rounded-xl text-blue-200 active:bg-white/10 shrink-0">
          <LogOut size={20} />
        </button>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-3">

        {/* Info general */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {orden.numero_os ? (
              <div className="col-span-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-blue-500 font-medium">No. OS (ERP)</p>
                <p className="font-bold text-blue-700 text-base">{orden.numero_os}</p>
              </div>
            ) : null}
            {orden.nci ? (
              <div className="col-span-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-orange-500 font-medium">NCI (Terex/Deutz)</p>
                <p className="font-bold text-orange-700 text-base">{orden.nci}</p>
              </div>
            ) : null}
            <div className="col-span-2">
              <p className="text-xs text-gray-400">Cliente</p>
              <p className="font-medium text-gray-800">{orden.cliente_nombre || '—'}</p>
            </div>
            {orden.contacto ? (
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Contacto</p>
                <p className="font-medium text-gray-800">{orden.contacto}</p>
              </div>
            ) : null}
            <div className="col-span-2">
              <p className="text-xs text-gray-400">Dirección / Ubicación</p>
              <p className="font-medium text-gray-800">{orden.ubicacion || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Fecha</p>
              <p className="font-medium text-gray-800">{formatFecha(orden.fecha_servicio)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Tipo</p>
              <p className="font-medium text-gray-800">{orden.tipo_servicio}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">OEM</p>
              <p className="font-medium text-gray-800">{orden.oem}</p>
            </div>
            {orden.observaciones ? (
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Observaciones</p>
                <p className="font-medium text-gray-800 text-xs leading-relaxed">{orden.observaciones}</p>
              </div>
            ) : null}
          </div>
        </div>

        {esCerrada && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle size={18} className="shrink-0" />
              <span>Orden cerrada técnicamente</span>
            </div>
            <button
              onClick={() => onVerReporte(orden.id)}
              className="flex items-center gap-1.5 bg-[#AA0000] text-white text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform shrink-0"
            >
              <FileDown size={14} />
              Ver reporte
            </button>
          </div>
        )}

        {/* Secciones */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Secciones</p>
        {PASOS.map(({ id, label, desc, icon: Icon }) => {
          const listo = progreso[id]
          return (
            <button
              key={id}
              onClick={() => !esCerrada || id !== 'cierre' ? setPaso(id) : null}
              disabled={esCerrada && id === 'cierre'}
              className={`w-full rounded-2xl p-4 flex items-center gap-3 shadow-sm border active:scale-95 transition-transform disabled:opacity-50 ${listo ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${listo ? 'bg-green-100' : 'bg-gray-50'}`}>
                {listo
                  ? <CheckCircle size={20} className="text-green-600" />
                  : <Icon size={20} className="text-[#AA0000]" />
                }
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium text-sm ${listo ? 'text-green-800' : 'text-gray-800'}`}>{label}</p>
                <p className={`text-xs mt-0.5 ${listo ? 'text-green-600' : 'text-gray-400'}`}>
                  {listo ? 'Información capturada' : desc}
                </p>
              </div>
              <ChevronRight size={18} className={listo ? 'text-green-400' : 'text-gray-300'} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
