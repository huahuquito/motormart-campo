import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { LogoIcon } from '../components/Logo'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError('Correo o contraseña incorrectos')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #0f2744 0%, #1a3a5c 60%, #1e4976 100%)' }}>
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="max-w-sm w-full mx-auto">

          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-4">
              <LogoIcon size={72} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Motor Mart</h1>
            <p className="text-blue-200 text-sm mt-1 font-medium tracking-widest uppercase">Servicios en campo</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-4">
            <h2 className="text-gray-800 font-bold text-lg text-center">Iniciar sesión</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Correo electrónico</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] focus:border-transparent"
                  placeholder="usuario@motormart.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Contraseña</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AA0000] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-2xl">{error}</div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white disabled:opacity-60 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #AA0000, #cc1111)' }}
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-blue-300/60 py-4">Motor Mart © {new Date().getFullYear()}</p>
    </div>
  )
}
