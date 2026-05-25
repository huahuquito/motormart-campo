import { useState } from 'react'
import { useOrdenCompleta } from '../hooks/useOrdenCompleta'
import { generarPDFOrden } from '../lib/generarPDF'
import { db } from '../lib/db'
import { formatFecha, formatHora } from '../lib/utils'
import { LogoPDF } from '../components/Logo'
import { ArrowLeft, Download, Loader } from 'lucide-react'

const RESULTADO_LABEL = {
  operativo: 'Equipo operativo',
  operativo_recomendaciones: 'Operativo con recomendaciones',
  pendiente_partes: 'Pendiente de partes',
  fuera_servicio: 'Fuera de servicio',
}


function Separador() {
  return <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
}

function Campo({ label, valor }) {
  if (!valor) return null
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <p style={{ fontSize: 11, color: '#111827', margin: '1px 0 0', fontWeight: 500 }}>{valor}</p>
    </div>
  )
}

function Grilla({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>{children}</div>
}

function SeccionTitulo({ children }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #0f2744, #1a3a5c)', color: 'white', padding: '5px 10px', borderRadius: 4, marginBottom: 8, marginTop: 12, borderLeft: '3px solid #AA0000' }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</span>
    </div>
  )
}

function FotoGrid({ fotos, label }) {
  if (!fotos || fotos.length === 0) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {fotos.map((url, i) => url && (
          <img key={i} src={url} alt=""
            style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }} />
        ))}
      </div>
    </div>
  )
}

// Contenido del reporte (se renderiza en un div oculto para captura)
function ContenidoReporte({ data }) {
  const { orden, equipo, tiempos, diagnostico, memoria, partes, cierre, fotosPorCategoria, fotoPlacaMotor, fotoPlacaMaquina } = data
  const esGarantia = orden?.tipo_servicio === 'Garantía Deutz'

  return (
    <div id="reporte-pdf-content" style={{ width: 794, padding: '32px 40px', fontFamily: 'Arial, sans-serif', backgroundColor: 'white', color: '#111827' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <LogoPDF />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2744' }}>{orden?.folio}</div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>{formatFecha(orden?.fecha_servicio)}</div>
          <div style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 12, backgroundColor: esGarantia ? '#fef3c7' : '#dbeafe', color: esGarantia ? '#92400e' : '#1e40af', fontSize: 9, fontWeight: 600 }}>
            {orden?.tipo_servicio}
          </div>
        </div>
      </div>

      {/* Banda de color */}
      <div style={{ height: 4, borderRadius: 2, marginBottom: 14, background: 'linear-gradient(90deg, #AA0000 0%, #0f2744 100%)' }} />

      {/* 1. Datos generales */}
      <SeccionTitulo>1. Datos generales del servicio</SeccionTitulo>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {orden?.numero_os && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No. OS (ERP)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8' }}>{orden.numero_os}</span>
          </div>
        )}
        {orden?.nci && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NCI</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#c2410c' }}>{orden.nci}</span>
          </div>
        )}
      </div>
      <Grilla>
        <Campo label="Cliente" valor={orden?.cliente_nombre} />
        <Campo label="Contacto" valor={orden?.contacto} />
        <Campo label="Ubicación del servicio" valor={orden?.ubicacion} />
        <Campo label="OEM" valor={orden?.oem} />
        <Campo label="Técnico responsable" valor={orden?.tecnico_nombre} />
        <Campo label="Estatus" valor={orden?.estatus} />
        {orden?.gps_lat && <Campo label="Coordenadas GPS" valor={`${orden.gps_lat?.toFixed(5)}, ${orden.gps_lng?.toFixed(5)}`} />}
        {orden?.creado_por && <Campo label="Creado por" valor={orden.creado_por} />}
      </Grilla>

      {/* 2. Identificación del equipo */}
      <SeccionTitulo>2. Identificación del equipo</SeccionTitulo>
      <Grilla>
        <Campo label="Marca del motor" valor={equipo?.marca_motor} />
        <Campo label="Modelo del motor" valor={equipo?.modelo_motor} />
        <Campo label="Serie del motor" valor={equipo?.serie_motor} />
        <Campo label="Horas del motor" valor={equipo?.horas_motor ? `${equipo.horas_motor} hrs` : null} />
        <Campo label="Modelo de la máquina" valor={equipo?.modelo_maquina} />
        <Campo label="Serie de la máquina" valor={equipo?.serie_maquina} />
      </Grilla>
      {(fotoPlacaMotor || fotoPlacaMaquina) && (
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {fotoPlacaMotor && (
            <div>
              <p style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>PLACA DEL MOTOR</p>
              <img src={fotoPlacaMotor} alt="Placa motor"
                style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }} />
            </div>
          )}
          {fotoPlacaMaquina && (
            <div>
              <p style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>PLACA DE LA MÁQUINA</p>
              <img src={fotoPlacaMaquina} alt="Placa máquina"
                style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }} />
            </div>
          )}
        </div>
      )}

      {/* 3. Tiempos */}
      {tiempos && (
        <>
          <SeccionTitulo>3. Registro de tiempos</SeccionTitulo>
          <Grilla>
            <Campo label="Llegada al sitio" valor={formatHora(tiempos?.hora_llegada)} />
            <Campo label="Inicio del trabajo" valor={formatHora(tiempos?.hora_inicio)} />
            <Campo label="Fin del trabajo" valor={formatHora(tiempos?.hora_fin)} />
            <Campo label="Salida del sitio" valor={formatHora(tiempos?.hora_salida)} />
          </Grilla>
        </>
      )}

      {/* 4. Diagnóstico */}
      {diagnostico && (
        <>
          <SeccionTitulo>4. Diagnóstico</SeccionTitulo>
          <Campo label="Falla reportada por el cliente" valor={diagnostico?.falla_reportada} />
          <Campo label="Síntomas observados" valor={diagnostico?.sintomas} />
          {diagnostico?.codigos && <Campo label="Códigos de falla activos" valor={diagnostico.codigos} />}
          {diagnostico?.diag_preliminar && <Campo label="Diagnóstico preliminar" valor={diagnostico.diag_preliminar} />}
          <Campo label="Diagnóstico final" valor={diagnostico?.diag_final} />
        </>
      )}

      {/* 5. Diagnóstico electrónico (Mem1 / Mem2) */}
      {memoria && (
        <>
          <SeccionTitulo>5. Diagnóstico electrónico (Memorias ECU)</SeccionTitulo>
          {!memoria.aplica ? (
            <p style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>No aplica para este servicio</p>
          ) : (
            <>
              {memoria.herramienta && <Campo label="Herramienta utilizada" valor={memoria.herramienta} />}

              {/* Mem1 */}
              <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '8px 10px', marginTop: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#c2410c' }}>MEM1 — Códigos activos</span>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, backgroundColor: memoria.mem1_descargada ? '#dcfce7' : '#fee2e2', color: memoria.mem1_descargada ? '#166534' : '#991b1b' }}>
                    {memoria.mem1_descargada ? '✓ Descargada' : '✗ No descargada'}
                  </span>
                </div>
                {memoria.mem1_notas && <p style={{ fontSize: 10, color: '#374151', margin: 0 }}>{memoria.mem1_notas}</p>}
                {memoria.mem1_pdf_url && (
                  <p style={{ fontSize: 9, color: '#1d4ed8', marginTop: 4, wordBreak: 'break-all' }}>
                    Archivo PDF: <a href={memoria.mem1_pdf_url} style={{ color: '#1d4ed8' }}>{memoria.mem1_pdf_nombre || 'Ver PDF Mem1'}</a>
                  </p>
                )}
                {(memoria.mem1_foto_local || memoria.mem1_foto_url) && (
                  <img src={memoria.mem1_foto_local || memoria.mem1_foto_url} alt="Mem1" style={{ width: 180, height: 110, objectFit: 'cover', borderRadius: 4, marginTop: 6 }} />
                )}
              </div>

              {/* Mem2 */}
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 10px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8' }}>MEM2 — Historial de códigos</span>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, backgroundColor: memoria.mem2_descargada ? '#dcfce7' : '#fee2e2', color: memoria.mem2_descargada ? '#166534' : '#991b1b' }}>
                    {memoria.mem2_descargada ? '✓ Descargada' : '✗ No descargada'}
                  </span>
                </div>
                {memoria.mem2_notas && <p style={{ fontSize: 10, color: '#374151', margin: 0 }}>{memoria.mem2_notas}</p>}
                {memoria.mem2_pdf_url && (
                  <p style={{ fontSize: 9, color: '#1d4ed8', marginTop: 4, wordBreak: 'break-all' }}>
                    Archivo PDF: <a href={memoria.mem2_pdf_url} style={{ color: '#1d4ed8' }}>{memoria.mem2_pdf_nombre || 'Ver PDF Mem2'}</a>
                  </p>
                )}
                {(memoria.mem2_foto_local || memoria.mem2_foto_url) && (
                  <img src={memoria.mem2_foto_local || memoria.mem2_foto_url} alt="Mem2" style={{ width: 180, height: 110, objectFit: 'cover', borderRadius: 4, marginTop: 6 }} />
                )}
              </div>

              {memoria.comentarios && <Campo label="Comentarios del diagnóstico electrónico" valor={memoria.comentarios} />}
            </>
          )}
        </>
      )}

      {/* 6. Evidencia fotográfica */}
      {Object.values(fotosPorCategoria).flat().length > 0 && (
        <>
          <SeccionTitulo>6. Evidencia fotográfica</SeccionTitulo>
          <FotoGrid fotos={fotosPorCategoria.antes} label="Antes del trabajo" />
          <FotoGrid fotos={fotosPorCategoria.falla} label="Evidencia de la falla" />
          <FotoGrid fotos={fotosPorCategoria.durante} label="Durante el trabajo" />
          <FotoGrid fotos={fotosPorCategoria.despues} label="Después del trabajo" />
        </>
      )}

      {/* 7. Trabajo realizado */}
      {(cierre?.trabajo_realizado || partes?.length > 0) && (
        <>
          <SeccionTitulo>7. Trabajo realizado</SeccionTitulo>
          {cierre?.trabajo_realizado && <Campo label="Descripción del trabajo" valor={cierre.trabajo_realizado} />}
          {partes?.length > 0 && (
            <>
              <p style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', marginTop: 6, marginBottom: 4 }}>Partes utilizadas</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>N° de parte</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Descripción</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {partes.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '4px 8px' }}>{p.numero_parte || '—'}</td>
                      <td style={{ padding: '4px 8px' }}>{p.descripcion || '—'}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>{p.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {/* 8. Resultado y cierre */}
      {cierre && (
        <>
          <SeccionTitulo>8. Resultado y conclusión técnica</SeccionTitulo>
          <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px', marginBottom: 8 }}>
            <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 2px' }}>RESULTADO DEL SERVICIO</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: 0 }}>
              {RESULTADO_LABEL[cierre.resultado] || cierre.resultado}
            </p>
          </div>
          <Campo label="Conclusión técnica" valor={cierre.conclusion} />
          {cierre.recomendaciones && <Campo label="Recomendaciones" valor={cierre.recomendaciones} />}
        </>
      )}

      {/* 9. Firma */}
      {cierre && (
        <>
          <SeccionTitulo>9. Conformidad del cliente</SeccionTitulo>
          <Campo label="Nombre del contacto" valor={cierre.nombre_contacto} />
          {cierre.email_contacto && <Campo label="Correo electrónico" valor={cierre.email_contacto} />}
          {cierre.sin_firma ? (
            <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '6px 10px', marginTop: 6 }}>
              <p style={{ fontSize: 9, color: '#92400e', margin: 0 }}>Sin firma — {cierre.justificacion_sin_firma}</p>
            </div>
          ) : cierre.firma_data ? (
            <div style={{ marginTop: 6 }}>
              <p style={{ fontSize: 9, color: '#6b7280', marginBottom: 4 }}>FIRMA DIGITAL DEL CLIENTE</p>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: 4, display: 'inline-block', backgroundColor: '#ffffff' }}>
                <div
                  data-firma-src={cierre.firma_data}
                  style={{ width: 220, height: 70, backgroundColor: '#ffffff',
                    backgroundImage: `url("${cierre.firma_data}")`,
                    backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'left center' }}
                />
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Pie de página */}
      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 24, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8, color: '#9ca3af' }}>Motor Mart Servicios en Campo — {new Date().toLocaleDateString('es-MX')}</span>
        <span style={{ fontSize: 8, color: '#9ca3af' }}>{orden?.folio} · Técnico: {orden?.tecnico_nombre || '—'}</span>
      </div>
    </div>
  )
}

export default function ReportePreview({ ordenId, onBack }) {
  const { data, loading } = useOrdenCompleta(ordenId)
  const [generando, setGenerando] = useState(false)
  const descargar = async () => {
    setGenerando(true)
    try {
      await generarPDFOrden('reporte-pdf-content', `${data.orden.folio}.pdf`)
    } catch (e) {
      alert('Error al generar el PDF. Intenta de nuevo.')
    }
    setGenerando(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Preparando reporte...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#AA0000] text-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg active:bg-red-900">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Reporte de servicio</h1>
          <p className="text-red-200 text-xs">{data?.orden?.folio}</p>
        </div>
        <button
          onClick={descargar}
          disabled={generando}
          className="flex items-center gap-1.5 bg-white text-[#AA0000] px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-transform"
        >
          {generando ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
          {generando ? 'Generando...' : 'Descargar PDF'}
        </button>
      </header>

      {/* Aviso */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 text-center">
        Vista previa del reporte. Toca "Descargar PDF" para guardar el archivo.
      </div>

      {/* Vista previa scrolleable */}
      <div className="overflow-x-auto py-4 px-2">
        <div className="mx-auto shadow-lg" style={{ width: 'fit-content' }}>
          {data && <ContenidoReporte data={data} />}
        </div>
      </div>
    </div>
  )
}
