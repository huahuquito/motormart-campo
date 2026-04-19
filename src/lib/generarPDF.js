import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

async function esperarRender() {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

export async function generarPDFOrden(elementoId, nombreArchivo) {
  const elemento = document.getElementById(elementoId)
  if (!elemento) throw new Error('Elemento no encontrado')

  // Guardar posición de la firma ANTES de cualquier manipulación del DOM
  const firmaDiv = elemento.querySelector('[data-firma-src]')
  let firmaInfo = null
  if (firmaDiv) {
    const reportRect = elemento.getBoundingClientRect()
    const firmaRect  = firmaDiv.getBoundingClientRect()
    firmaInfo = {
      src:    firmaDiv.getAttribute('data-firma-src'),
      top:    firmaRect.top  - reportRect.top,   // px desde el tope del reporte
      left:   firmaRect.left - reportRect.left,
      width:  firmaRect.width,
      height: firmaRect.height,
    }
    // Ocultar el placeholder para que html2canvas no capture un área en blanco
    firmaDiv.style.visibility = 'hidden'
  }

  await esperarRender()

  const canvas = await html2canvas(elemento, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  // Restaurar visibilidad
  if (firmaDiv) firmaDiv.style.visibility = ''

  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const margin  = 12
  const pageW   = pdf.internal.pageSize.getWidth()
  const pageH   = pdf.internal.pageSize.getHeight()
  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2
  const imgH    = (canvas.height * usableW) / canvas.width

  // Factor de conversión: píxeles CSS del reporte → mm en el PDF
  const pxToMm = usableW / elemento.offsetWidth

  let yOffset  = 0
  let restante = imgH

  while (restante > 0) {
    if (yOffset > 0) pdf.addPage()

    pdf.addImage(imgData, 'JPEG', margin, margin - yOffset, usableW, imgH)

    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, 0,            pageW, margin,     'F')
    pdf.rect(0, pageH - margin, pageW, margin + 1, 'F')
    pdf.rect(0, 0,            margin, pageH,     'F')
    pdf.rect(pageW - margin, 0, margin + 1, pageH, 'F')

    yOffset  += usableH
    restante -= usableH
  }

  // Agregar la firma directamente con jsPDF (bypass html2canvas)
  if (firmaInfo) {
    const firmaYmm   = firmaInfo.top    * pxToMm  // mm desde el tope del contenido
    const firmaXmm   = margin + firmaInfo.left   * pxToMm
    const firmaWmm   = firmaInfo.width  * pxToMm
    const firmaHmm   = firmaInfo.height * pxToMm

    // En qué página cae la firma
    const pageNum    = Math.floor(firmaYmm / usableH)   // 0-indexed
    const yEnPagina  = margin + (firmaYmm - pageNum * usableH)

    pdf.setPage(pageNum + 1)  // jsPDF es 1-indexed
    pdf.addImage(firmaInfo.src, 'PNG', firmaXmm, yEnPagina, firmaWmm, firmaHmm)
  }

  pdf.save(nombreArchivo)
  return pdf.output('datauristring')
}
