'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const params = useSearchParams()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('email', { email, redirect: false, callbackUrl: '/dashboard' })
    if (result?.error) setError('Something went wrong. Check your email address.')
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-[0.015]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-base font-semibold text-slate-100 tracking-tight font-display">LS Capital</div>
              <div className="text-[10px] text-slate-500 tracking-widest uppercase">Deal Intelligence System</div>
            </div>
          </div>
        </div>

        {sent ? (
          <div className="card p-7 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-slate-200 font-medium mb-2">Check your inbox</h2>
            <p className="text-slate-400 text-sm">Sign-in link sent to <span className="text-slate-200">{email}</span></p>
            <button onClick={() => { setSent(false); setEmail('') }} className="mt-5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Use different email
            </button>
          </div>
        ) : (
          <div className="card p-7">
            <h1 className="text-slate-100 font-semibold mb-1 font-display">Sign in</h1>
            <p className="text-slate-500 text-sm mb-6">Enter your email to receive a secure link</p>

            {(error || params.get('error')) && (
              <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                {error || 'Authentication failed. Please try again.'}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@lsfinance.com"
                  required
                  className="input"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending…' : 'Send sign-in link →'}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-600">
              Internal use only · LS Finance LLC
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
