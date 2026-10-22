
import { useState } from 'react'
import audixaLogo from '../assets/g.png'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanUsername = username.trim().toLowerCase()

    if (!cleanUsername || !password) {
      setError('Please enter your username and password.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUsername,
          password,
        }),
      })

      const session = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(
          session.detail || 'Unable to sign in. Please try again.'
        )
      }

      if (!session.token || !session.username || !session.role) {
        throw new Error('The server returned an invalid login response.')
      }

      // Keep the existing storage key for frontend compatibility.
      localStorage.setItem('audixa-user', JSON.stringify(session))

      // Pass the complete session, including the JWT, to the parent.
      onLogin(session)
    } catch (err) {
      setError(
        err.message || 'Unable to connect to the Audixa API.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#101A14] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <img
            src={audixaLogo}
            alt="Audixa"
            className="h-14 object-contain"
          />
        </div>

        <h1 className="text-xl font-semibold text-center text-gray-900">
          Audixa Platform Login
        </h1>

        <p className="text-xs text-gray-500 text-center mt-1 mb-6">
          Firewall Audit Analytics
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="text-xs text-gray-600"
            >
              Username
            </label>

            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              maxLength={100}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3E522C]"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-xs text-gray-600"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3E522C]"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3E522C] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
