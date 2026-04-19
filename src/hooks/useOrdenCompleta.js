import { useState, useEffect } from 'react'
import { db } from '../lib/db'

// Carga todos los datos de una orden desde IndexedDB
export function useOrdenCompleta(ordenId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ordenId) return
    cargar()
  }, [ordenId])

  async function cargar() {
    setLoading(true)
    const [orden, equipo, tiempos, diagnostico, memoria, partes, cierre, evidencias] = await Promise.all([
      db.ordenes.get(ordenId),
      db.equipos_orden.where('orden_id').equals(ordenId).first(),
      db.tiempos.where('orden_id').equals(ordenId).first(),
      db.diagnosticos.where('orden_id').equals(ordenId).first(),
      db.memorias_ecu.where('orden_id').equals(ordenId).first(),
      db.partes.where('orden_id').equals(ordenId).toArray(),
      db.cierres.where('orden_id').equals(ordenId).first(),
      db.evidencia.where('orden_id').equals(ordenId).toArray(),
    ])

    const fotosPorCategoria = {
      antes:   evidencias.filter(e => e.categoria === 'antes').map(e => e.ruta_local),
      durante: evidencias.filter(e => e.categoria === 'durante').map(e => e.ruta_local),
      despues: evidencias.filter(e => e.categoria === 'despues').map(e => e.ruta_local),
      falla:   evidencias.filter(e => e.categoria === 'falla').map(e => e.ruta_local),
    }

    // Fotos de placa — se guardan en evidencia con sus propias categorías
    const fotoPlacaMotor   = evidencias.find(e => e.categoria === 'placa_motor')?.ruta_local   || null
    const fotoPlacaMaquina = evidencias.find(e => e.categoria === 'placa_maquina')?.ruta_local || null

    setData({ orden, equipo, tiempos, diagnostico, memoria, partes, cierre, fotosPorCategoria, fotoPlacaMotor, fotoPlacaMaquina })
    setLoading(false)
  }

  return { data, loading, recargar: cargar }
}
