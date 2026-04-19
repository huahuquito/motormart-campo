import { supabase } from './supabase'
import { db } from './db'

// Convierte base64 a Blob para subir a Storage
function base64ABlob(base64, tipo = 'image/jpeg') {
  const byteString = atob(base64.split(',')[1])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
  return new Blob([ab], { type: tipo })
}

async function subirFotoStorage(base64, path) {
  const blob = base64ABlob(base64)
  const { error } = await supabase.storage.from('motormart').upload(path, blob, {
    contentType: 'image/jpeg', upsert: true
  })
  if (error) throw error
  const { data } = supabase.storage.from('motormart').getPublicUrl(path)
  return data.publicUrl
}

export async function sincronizar() {
  const resultados = { ok: 0, errores: 0 }

  // 1. Órdenes — usar supabase_id (UUID real) para actualizar el registro correcto
  const ordenesPendientes = await db.ordenes.filter(o => !!o.sync_pendiente).toArray()
  for (const orden of ordenesPendientes) {
    const { id: localId, sync_pendiente, supabase_id, ...data } = orden
    if (!supabase_id) { resultados.errores++; continue }
    const { error } = await supabase
      .from('ordenes')
      .update({ estatus: orden.estatus, numero_os: orden.numero_os ?? null, updated_at: orden.updated_at })
      .eq('id', supabase_id)
    if (!error) { await db.ordenes.update(localId, { sync_pendiente: false }); resultados.ok++ }
    else resultados.errores++
  }

  // 2. Equipos
  const equiposPendientes = await db.equipos_orden.filter(o => !!o.sync_pendiente).toArray()
  for (const eq of equiposPendientes) {
    const ordenLocal = await db.ordenes.get(eq.orden_id)
    if (!ordenLocal) continue
    const { id, sync_pendiente, orden_id, ...data } = eq
    const { error } = await supabase.from('equipos_orden').upsert({ ...data, orden_folio: ordenLocal.folio })
    if (!error) { await db.equipos_orden.update(id, { sync_pendiente: false }); resultados.ok++ }
    else resultados.errores++
  }

  // 3. Tiempos
  const tiemposPendientes = await db.tiempos.filter(o => !!o.sync_pendiente).toArray()
  for (const t of tiemposPendientes) {
    const ordenLocal = await db.ordenes.get(t.orden_id)
    if (!ordenLocal) continue
    const { id, sync_pendiente, orden_id, ...data } = t
    const { error } = await supabase.from('tiempos').upsert({ ...data, orden_folio: ordenLocal.folio })
    if (!error) { await db.tiempos.update(id, { sync_pendiente: false }); resultados.ok++ }
    else resultados.errores++
  }

  // 4. Diagnósticos
  const diagsPendientes = await db.diagnosticos.filter(o => !!o.sync_pendiente).toArray()
  for (const d of diagsPendientes) {
    const ordenLocal = await db.ordenes.get(d.orden_id)
    if (!ordenLocal) continue
    const { id, sync_pendiente, orden_id, ...data } = d
    const { error } = await supabase.from('diagnosticos').upsert({ ...data, orden_folio: ordenLocal.folio })
    if (!error) { await db.diagnosticos.update(id, { sync_pendiente: false }); resultados.ok++ }
    else resultados.errores++
  }

  // 5. Evidencia — sube fotos base64 a Supabase Storage
  const evidenciaPendiente = await db.evidencia.filter(o => !!o.sync_pendiente).toArray()
  for (const ev of evidenciaPendiente) {
    const ordenLocal = await db.ordenes.get(ev.orden_id)
    if (!ordenLocal) continue
    try {
      let ruta_storage = ev.ruta_storage
      // Si tiene base64 local y no tiene URL remota, sube la foto
      if (ev.ruta_local && ev.ruta_local.startsWith('data:') && !ruta_storage) {
        const path = `${ordenLocal.folio}/${ev.categoria}_${ev.id}.jpg`
        ruta_storage = await subirFotoStorage(ev.ruta_local, path)
        await db.evidencia.update(ev.id, { ruta_storage })
      }
      const { id, sync_pendiente, orden_id, ruta_local, ...data } = ev
      const { error } = await supabase.from('evidencia').upsert({
        ...data,
        ruta_storage,
        orden_folio: ordenLocal.folio,
      })
      if (!error) { await db.evidencia.update(ev.id, { sync_pendiente: false }); resultados.ok++ }
      else resultados.errores++
    } catch {
      resultados.errores++
    }
  }

  // 6. Partes
  const partesPendientes = await db.partes.filter(o => !!o.sync_pendiente).toArray()
  for (const p of partesPendientes) {
    const ordenLocal = await db.ordenes.get(p.orden_id)
    if (!ordenLocal) continue
    const { id, sync_pendiente, orden_id, ...data } = p
    const { error } = await supabase.from('partes').upsert({ ...data, orden_folio: ordenLocal.folio })
    if (!error) { await db.partes.update(id, { sync_pendiente: false }); resultados.ok++ }
    else resultados.errores++
  }

  // 7. Memorias ECU
  const memoriasPendientes = await db.memorias_ecu.filter(o => !!o.sync_pendiente).toArray()
  for (const m of memoriasPendientes) {
    const ordenLocal = await db.ordenes.get(m.orden_id)
    if (!ordenLocal) continue
    const { id, sync_pendiente, orden_id, mem1_pdf_blob, mem2_pdf_blob, mem1_foto_local, mem2_foto_local, ...data } = m
    const { error } = await supabase.from('memorias_ecu').upsert({ ...data, orden_folio: ordenLocal.folio })
    if (!error) { await db.memorias_ecu.update(id, { sync_pendiente: false }); resultados.ok++ }
    else resultados.errores++
  }

  // 8. Cierres
  const cierresPendientes = await db.cierres.filter(o => !!o.sync_pendiente).toArray()
  for (const c of cierresPendientes) {
    const ordenLocal = await db.ordenes.get(c.orden_id)
    if (!ordenLocal) continue
    const { id, sync_pendiente, orden_id, ...data } = c
    const { error } = await supabase.from('cierres').upsert({ ...data, orden_folio: ordenLocal.folio })
    if (!error) { await db.cierres.update(id, { sync_pendiente: false }); resultados.ok++ }
    else resultados.errores++
  }

  return resultados
}

export async function contarPendientes() {
  const counts = await Promise.all([
    db.ordenes.filter(o => !!o.sync_pendiente).count(),
    db.tiempos.filter(o => !!o.sync_pendiente).count(),
    db.diagnosticos.filter(o => !!o.sync_pendiente).count(),
    db.equipos_orden.filter(o => !!o.sync_pendiente).count(),
    db.evidencia.filter(o => !!o.sync_pendiente).count(),
    db.partes.filter(o => !!o.sync_pendiente).count(),
    db.memorias_ecu.filter(o => !!o.sync_pendiente).count(),
    db.cierres.filter(o => !!o.sync_pendiente).count(),
  ])
  return counts.reduce((a, b) => a + b, 0)
}
