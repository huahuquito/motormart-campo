import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'

// Carga todos los datos de una orden desde IndexedDB.
// Si algún dato no existe localmente (p.ej. el administrador viendo una
// orden capturada por un técnico en otro dispositivo), se completa desde Supabase
// usando el folio de la orden.
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

    let equipoFinal = equipo
    let tiemposFinal = tiempos
    let diagnosticoFinal = diagnostico
    let memoriaFinal = memoria
    let partesFinal = partes
    let cierreFinal = cierre
    let evidenciasFinal = evidencias

    // Completar desde Supabase los datos que no estén en este dispositivo
    if (orden?.supabase_id) {
      const ordenSupabaseId = orden.supabase_id
      const [
        { data: equipoRemoto },
        { data: tiemposRemoto },
        { data: diagnosticoRemoto },
        { data: memoriaRemota },
        { data: partesRemotas },
        { data: cierreRemoto },
        { data: evidenciasRemotas },
      ] = await Promise.all([
        equipoFinal      ? Promise.resolve({ data: null }) : supabase.from('equipos_orden').select('*').eq('orden_id', ordenSupabaseId).maybeSingle(),
        tiemposFinal     ? Promise.resolve({ data: null }) : supabase.from('tiempos').select('*').eq('orden_id', ordenSupabaseId).maybeSingle(),
        diagnosticoFinal ? Promise.resolve({ data: null }) : supabase.from('diagnosticos').select('*').eq('orden_id', ordenSupabaseId).maybeSingle(),
        memoriaFinal     ? Promise.resolve({ data: null }) : supabase.from('memorias_ecu').select('*').eq('orden_id', ordenSupabaseId).maybeSingle(),
        partesFinal?.length ? Promise.resolve({ data: null }) : supabase.from('partes').select('*').eq('orden_id', ordenSupabaseId),
        cierreFinal      ? Promise.resolve({ data: null }) : supabase.from('cierres').select('*').eq('orden_id', ordenSupabaseId).maybeSingle(),
        evidenciasFinal?.length ? Promise.resolve({ data: null }) : supabase.from('evidencia').select('*').eq('orden_id', ordenSupabaseId),
      ])

      equipoFinal      = equipoFinal      || equipoRemoto      || equipoFinal
      tiemposFinal     = tiemposFinal     || tiemposRemoto     || tiemposFinal
      diagnosticoFinal = diagnosticoFinal || diagnosticoRemoto || diagnosticoFinal
      memoriaFinal     = memoriaFinal     || memoriaRemota     || memoriaFinal
      cierreFinal      = cierreFinal      || cierreRemoto      || cierreFinal
      partesFinal      = partesFinal?.length      ? partesFinal      : (partesRemotas || partesFinal)
      evidenciasFinal  = evidenciasFinal?.length  ? evidenciasFinal  : (evidenciasRemotas || evidenciasFinal)
    }

    // Las fotos remotas se guardan en `ruta_storage` (URL pública), las locales en `ruta_local`
    const fotosPorCategoria = {
      antes:   evidenciasFinal.filter(e => e.categoria === 'antes').map(e => e.ruta_local || e.ruta_storage),
      durante: evidenciasFinal.filter(e => e.categoria === 'durante').map(e => e.ruta_local || e.ruta_storage),
      despues: evidenciasFinal.filter(e => e.categoria === 'despues').map(e => e.ruta_local || e.ruta_storage),
      falla:   evidenciasFinal.filter(e => e.categoria === 'falla').map(e => e.ruta_local || e.ruta_storage),
    }

    // Fotos de placa — se guardan en evidencia con sus propias categorías
    const placaMotor   = evidenciasFinal.find(e => e.categoria === 'placa_motor')
    const placaMaquina = evidenciasFinal.find(e => e.categoria === 'placa_maquina')
    const fotoPlacaMotor   = placaMotor?.ruta_local   || placaMotor?.ruta_storage   || null
    const fotoPlacaMaquina = placaMaquina?.ruta_local || placaMaquina?.ruta_storage || null

    setData({
      orden,
      equipo: equipoFinal,
      tiempos: tiemposFinal,
      diagnostico: diagnosticoFinal,
      memoria: memoriaFinal,
      partes: partesFinal,
      cierre: cierreFinal,
      fotosPorCategoria,
      fotoPlacaMotor,
      fotoPlacaMaquina,
    })
    setLoading(false)
  }

  return { data, loading, recargar: cargar }
}
