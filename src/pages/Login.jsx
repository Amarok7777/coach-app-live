import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [mode, setMode] = useState('login')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const { signIn, signUp } = useAuth()
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        setError(null); setLoading(true)
        const { error } = await (mode === 'login' ? signIn : signUp)(email, password)
        setLoading(false)
        if (error) setError(error.message)
        else navigate('/')
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, #f0fdf9 0%, #e8f5f3 50%, #f4fbf9 100%)' }}>

            <div className="w-full max-w-sm">

                {/* ── App logo + title ── */}
                <div className="text-center mb-8">
                    <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4 shadow-lg"
                        style={{ background: 'var(--md-primary)' }}>
                        <span className="material-symbols-outlined text-white icon-filled" style={{ fontSize: 32 }}>
                            sports_soccer
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-md-on-surface tracking-tight"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        Coach App
                    </h1>
                    <p className="text-sm text-md-outline mt-1">Trainer-Management Platform</p>
                </div>

                {/* ── Card ── */}
                <div className="bg-white rounded-2xl shadow-xl border border-md-outline-variant/40 overflow-hidden"
                    style={{ boxShadow: '0 20px 60px rgba(0,106,96,0.12), 0 4px 20px rgba(0,0,0,0.08)' }}>

                    {/* Mode toggle — tab style header */}
                    <div className="flex border-b border-md-outline-variant/60">
                        {[['login', 'Anmelden'], ['signup', 'Registrieren']].map(([m, label]) => (
                            <button key={m} type="button"
                                onClick={() => { setMode(m); setError(null) }}
                                className={`flex-1 py-3.5 text-sm font-bold transition-all
                  ${mode === m
                                        ? 'text-md-primary border-b-2 border-md-primary -mb-px bg-md-primary/4'
                                        : 'text-md-outline hover:text-md-on-surface'}`}
                                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Email */}
                            <div className="md-field">
                                <input
                                    type="email"
                                    className="md-input pr-10"
                                    placeholder=" "
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                                <label className="md-input-label">E-Mail-Adresse</label>
                                <span className="material-symbols-outlined icon-sm absolute right-3 top-3.5 text-md-outline pointer-events-none">
                                    mail
                                </span>
                            </div>

                            {/* Password */}
                            <div className="md-field">
                                <input
                                    type="password"
                                    className="md-input pr-10"
                                    placeholder=" "
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                />
                                <label className="md-input-label">Passwort</label>
                                <span className="material-symbols-outlined icon-sm absolute right-3 top-3.5 text-md-outline pointer-events-none">
                                    lock
                                </span>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined icon-sm text-red-500 mt-0.5 shrink-0">error</span>
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Submit */}
                            <button type="submit" disabled={loading}
                                className="btn-filled w-full justify-center py-3 text-sm font-bold mt-2"
                                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                {loading ? (
                                    <><span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>Bitte warten…</>
                                ) : mode === 'login' ? (
                                    <><span className="material-symbols-outlined icon-sm">login</span>Anmelden</>
                                ) : (
                                    <><span className="material-symbols-outlined icon-sm">person_add</span>Konto erstellen</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer hint */}
                <p className="text-center text-xs text-md-outline mt-6">
                    Deine Daten werden sicher bei Supabase gespeichert.
                </p>
            </div>
        </div>
    )
}