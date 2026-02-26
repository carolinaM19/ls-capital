export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-slate-200 font-medium font-display">Check your email</h2>
        <p className="text-slate-500 text-sm mt-2">A sign-in link has been sent to your inbox.</p>
        <a href="/login" className="mt-6 block text-xs text-slate-600 hover:text-slate-400 transition-colors">← Back</a>
      </div>
    </div>
  )
}
