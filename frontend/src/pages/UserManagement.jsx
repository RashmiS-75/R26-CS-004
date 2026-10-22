import { useState } from 'react'
import { UserPlus, Users, ShieldCheck, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiFetch } from '../api'

const INITIAL_FORM = {
  name: '',
  username: '',
  role: 'auditor',
  password: '',
}

export default function UserManagement() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: name === 'username' ? value.toLowerCase() : value,
    }))
    setMessage(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage(null)

    const payload = {
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      role: form.role,
      password: form.password,
    }

    if (payload.name.length < 2) {
      setMessage({ type: 'error', text: 'Enter a full name with at least 2 characters.' })
      return
    }

    if (!/^[a-z0-9._-]{3,32}$/.test(payload.username)) {
      setMessage({
        type: 'error',
        text: 'Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens.',
      })
      return
    }

    if (payload.password.length < 12) {
      setMessage({ type: 'error', text: 'Temporary password must be at least 12 characters.' })
      return
    }

    setSubmitting(true)
    try {
      const response = await apiFetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = typeof result.detail === 'string'
          ? result.detail
          : 'The account could not be created. Please try again.'
        setMessage({ type: 'error', text: detail })
        return
      }

      setMessage({
        type: 'success',
        text: `Account created for ${result.user?.name || payload.name} (${result.user?.username || payload.username}).`,
      })
      setForm(INITIAL_FORM)
      setShowPassword(false)
    } catch {
      setMessage({
        type: 'error',
        text: 'Could not connect to the Audixa API. Check that the backend is running.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4A5C2E]/10 text-[#4A5C2E]">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-black">User Management</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create and assign access roles for Audixa accounts.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <UserPlus size={19} className="text-[#4A5C2E]" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Create an account</h3>
          </div>

          {message && (
            <div
              role="status"
              aria-live="polite"
              className={`mb-5 flex items-start gap-2 rounded-xl border px-3 py-3 text-sm ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="user-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Full name</label>
              <input
                id="user-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={updateField}
                placeholder="Enter full name"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#4A5C2E] focus:ring-2 focus:ring-[#4A5C2E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="user-username" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Username</label>
              <input
                id="user-username"
                name="username"
                type="text"
                autoComplete="off"
                required
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9._-]{3,32}"
                value={form.username}
                onChange={updateField}
                placeholder="e.g. audit.user"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#4A5C2E] focus:ring-2 focus:ring-[#4A5C2E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">3–32 characters; letters, numbers, dots, underscores, and hyphens.</p>
            </div>

            <div>
              <label htmlFor="user-role" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Access role</label>
              <select
                id="user-role"
                name="role"
                value={form.role}
                onChange={updateField}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#4A5C2E] focus:ring-2 focus:ring-[#4A5C2E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="auditor">Auditor</option>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label htmlFor="user-password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Temporary password</label>
              <div className="relative">
                <input
                  id="user-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={form.password}
                  onChange={updateField}
                  placeholder="At least 12 characters"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#4A5C2E] focus:ring-2 focus:ring-[#4A5C2E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Share the temporary password securely with the account holder.</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4A5C2E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3C4B25] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <UserPlus size={17} />
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/60 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={19} className="text-[#4A5C2E]" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Role permissions</h3>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">Admin</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">Full access to permitted operations, including account creation and administrative actions.</p>
            </div>
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Auditor</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">Can run supported audit analyses and review results.</p>
            </div>
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Viewer</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">Read-only access to supported views and saved results.</p>
            </div>
          </div>
          <p className="mt-5 rounded-xl bg-white px-3 py-3 text-xs leading-5 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
            Only an authenticated Admin can create accounts. Passwords are hashed by the backend before being stored.
          </p>
        </aside>
      </div>
    </div>
  )
}
