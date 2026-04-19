// Logo de Motor Mart — usado en header, login y reporte PDF

export function LogoIcon({ size = 40, className = '' }) {
  return (
    <img
      src="/logo-motormart.png"
      alt="Motor Mart"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}

export function LogoCompleto({ className = '' }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logo-motormart.png"
        alt="Motor Mart"
        style={{ height: 44, width: 'auto', objectFit: 'contain' }}
      />
    </div>
  )
}

// Versión para el reporte PDF (inline style)
export function LogoPDF() {
  return (
    <img
      src="/logo-motormart.png"
      alt="Motor Mart"
      style={{ height: 64, width: 'auto', objectFit: 'contain' }}
    />
  )
}
