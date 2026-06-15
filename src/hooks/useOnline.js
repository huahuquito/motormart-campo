import { useState, useEffect } from 'react'

export function useOnline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    // En PWA instalada (sobre todo iOS) los eventos online/offline no se
    // disparan al reabrir la app desde segundo plano, así que también
    // revisamos navigator.onLine cuando la app vuelve a estar visible.
    const revisar = () => setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', revisar)
    window.addEventListener('focus', revisar)
    window.addEventListener('pageshow', revisar)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', revisar)
      window.removeEventListener('focus', revisar)
      window.removeEventListener('pageshow', revisar)
    }
  }, [])

  return isOnline
}
