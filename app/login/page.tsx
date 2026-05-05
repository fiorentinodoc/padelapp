'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register-instructor' | 'register-student' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [clubName, setClubName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function reset() {
    setError('')
    setSuccess('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setClubName('')
    setFirstName('')
    setLastName('')
  }

  function switchMode(m: Mode) {
    reset()
    setMode(m)
  }

  async function handleLogin() {
    if (!email || !password) { setError('Compila tutti i campi'); return }
    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      setError('Email o password non corretti')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'student') {
        router.push('/app')
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  async function handleRegisterInstructor() {
    if (!clubName || !email || !password) { setError('Compila tutti i campi obbligatori'); return }
    if (password !== confirmPassword) { setError('Le password non coincidono'); return }
    if (password.length < 6) { setError('La password deve avere almeno 6 caratteri'); return }
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { club_name: clubName } }
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data.user) {
      const slug = clubName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      await supabase.from('clubs').insert({
        name: clubName, slug, plan: 'free', max_students: 20
      })
      setSuccess('Account creato! Controlla la tua email per confermare, poi accedi.')
      setMode('login')
    }
    setLoading(false)
  }

  async function handleRegisterStudent() {
    if (!firstName || !lastName || !email || !password) { setError('Compila tutti i campi obbligatori'); return }
    if (password !== confirmPassword) { setError('Le password non coincidono'); return }
    if (password.length < 6) { setError('La password deve avere almeno 6 caratteri'); return }
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, role: 'student' } }
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data.user) {
      await supabase.from('profiles').update({
        first_name: firstName,
        last_name:  lastName,
        role:       'student'
      }).eq('id', data.user.id)

      setSuccess('Account creato! Controlla la tua email per confermare, poi accedi.')
      setMode('login')
    }
    setLoading(false)
  }

  async function handleForgot() {
    if (!email) { setError('Inserisci la tua email'); return }
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (resetError) { setError(resetError.message); setLoading(false); return }

    setSuccess('Email inviata! Controlla la tua casella e clicca il link per resettare la password.')
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', color: '#fff', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui'
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: '700', color: '#8b93a8',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    display: 'block', marginBottom: '6px'
  }
  const fieldStyle: React.CSSProperties = { marginBottom: '14px' }

  return (
    <div style={{
      minHeight: '100vh', background: '#0e1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui', padding: '20px'
    }}>
      <div style={{
        background: '#161b27', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', padding: '36px',
        width: '100%', maxWidth: '420px'
      }}>

        {/* Logo */}
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#c8f53a', marginBottom: '6px', letterSpacing: '-0.5px' }}>
          padel●
        </div>

        {/* Titolo dinamico */}
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
          {mode === 'login'                && 'Accedi al tuo account'}
          {mode === 'register-instructor'  && 'Registra il tuo club'}
          {mode === 'register-student'     && 'Registrati come giocatore'}
          {mode === 'forgot'               && 'Recupera la password'}
        </div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '28px' }}>
          {mode === 'login'                && 'Istruttore o giocatore'}
          {mode === 'register-instructor'  && 'Crea il tuo account istruttore'}
          {mode === 'register-student'     && 'Accedi alle lezioni del tuo club'}
          {mode === 'forgot'               && 'Ti mandiamo un link via email'}
        </div>

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tuaemail@esempio.it" style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="La tua password" style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '20px', marginTop: '-8px' }}>
              <span onClick={() => switchMode('forgot')} style={{ fontSize: '12px', color: '#5b7fff', cursor: 'pointer' }}>
                Password dimenticata?
              </span>
            </div>
            {error && <ErrorBox msg={error} />}
            {success && <SuccessBox msg={success} />}
            <button onClick={handleLogin} disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Accesso...' : 'Accedi →'}
            </button>
            <Divider />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => switchMode('register-instructor')} style={btnSecondary}>
                🎾 Sono istruttore
              </button>
              <button onClick={() => switchMode('register-student')} style={btnSecondary}>
                👤 Sono giocatore
              </button>
            </div>
          </>
        )}

        {/* ── REGISTRAZIONE ISTRUTTORE ── */}
        {mode === 'register-instructor' && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nome club / academy *</label>
              <input type="text" value={clubName} onChange={e => setClubName(e.target.value)} placeholder="Es: ASD Padel Roma" style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tuaemail@esempio.it" style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Password *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 6 caratteri" style={inputStyle} />
            </div>
            <div style={{ ...fieldStyle, marginBottom: '20px' }}>
              <label style={labelStyle}>Conferma password *</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ripeti la password" style={inputStyle} />
            </div>
            {error && <ErrorBox msg={error} />}
            {success && <SuccessBox msg={success} />}
            <button onClick={handleRegisterInstructor} disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Creazione...' : 'Crea account istruttore'}
            </button>
            <BackToLogin onClick={() => switchMode('login')} />
          </>
        )}

        {/* ── REGISTRAZIONE GIOCATORE ── */}
        {mode === 'register-student' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Marco" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cognome *</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Ferretti" style={inputStyle} />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tuaemail@esempio.it" style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Password *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 6 caratteri" style={inputStyle} />
            </div>
            <div style={{ ...fieldStyle, marginBottom: '20px' }}>
              <label style={labelStyle}>Conferma password *</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ripeti la password" style={inputStyle} />
            </div>
            {error && <ErrorBox msg={error} />}
            {success && <SuccessBox msg={success} />}
            <button onClick={handleRegisterStudent} disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Creazione...' : 'Crea account giocatore'}
            </button>
            <BackToLogin onClick={() => switchMode('login')} />
          </>
        )}

        {/* ── RECUPERO PASSWORD ── */}
        {mode === 'forgot' && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tuaemail@esempio.it" style={inputStyle} />
            </div>
            {error && <ErrorBox msg={error} />}
            {success && <SuccessBox msg={success} />}
            <button onClick={handleForgot} disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Invio...' : 'Invia link di recupero'}
            </button>
            <BackToLogin onClick={() => switchMode('login')} />
          </>
        )}

      </div>
    </div>
  )
}

// ── Componenti helper ──────────────────────────────────────

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#e85858', fontSize: '13px', marginBottom: '16px' }}>
      {msg}
    </div>
  )
}

function SuccessBox({ msg }: { msg: string }) {
  return (
    <div style={{ background: 'rgba(56,201,122,0.1)', border: '1px solid rgba(56,201,122,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#38c97a', fontSize: '13px', marginBottom: '16px' }}>
      {msg}
    </div>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ fontSize: '12px', color: '#5a5a6a' }}>Nuovo utente?</div>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

function BackToLogin({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <span onClick={onClick} style={{ fontSize: '13px', color: '#5b7fff', cursor: 'pointer', fontWeight: '600' }}>
        ← Torna al login
      </span>
    </div>
  )
}

function btnPrimary(loading: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '14px',
    background: loading ? '#5a7a20' : '#c8f53a',
    color: '#0e1117', border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: '700',
    cursor: loading ? 'not-allowed' : 'pointer',
    marginBottom: '4px', fontFamily: 'system-ui'
  }
}

const btnSecondary: React.CSSProperties = {
  padding: '12px', background: '#1e2535',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff', borderRadius: '10px',
  fontSize: '13px', fontWeight: '600',
  cursor: 'pointer', fontFamily: 'system-ui'
}