import Dexie from 'dexie'

export const db = new Dexie('MotorMartCampo')

db.version(1).stores({
  ordenes: '++id, folio, estatus, tecnico_id, cliente_id, tipo_servicio, sync_pendiente, updated_at',
  tiempos: '++id, orden_id, sync_pendiente',
  diagnosticos: '++id, orden_id, sync_pendiente',
  equipos_orden: '++id, orden_id, sync_pendiente',
  evidencia: '++id, orden_id, tipo, categoria, sync_pendiente',
  partes: '++id, orden_id, sync_pendiente',
  cierres: '++id, orden_id, sync_pendiente',
  clientes: '++id, nombre',
  tecnicos: '++id, nombre, user_id',
  cola_sync: '++id, tabla, record_id, accion, created_at',
})

// Versión 2: agrega tabla de memorias ECU (Mem1 y Mem2)
// Los blobs de PDF se almacenan localmente hasta sincronizar
db.version(2).stores({
  ordenes: '++id, folio, estatus, tecnico_id, cliente_id, tipo_servicio, sync_pendiente, updated_at',
  tiempos: '++id, orden_id, sync_pendiente',
  diagnosticos: '++id, orden_id, sync_pendiente',
  equipos_orden: '++id, orden_id, sync_pendiente',
  evidencia: '++id, orden_id, tipo, categoria, sync_pendiente',
  memorias_ecu: '++id, orden_id, sync_pendiente',
  partes: '++id, orden_id, sync_pendiente',
  cierres: '++id, orden_id, sync_pendiente',
  clientes: '++id, nombre',
  tecnicos: '++id, nombre, user_id',
  cola_sync: '++id, tabla, record_id, accion, created_at',
})

export default db
