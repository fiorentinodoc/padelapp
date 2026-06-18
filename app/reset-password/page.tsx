'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
  // Processa il token hash dall'URL manualmente
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const accessToken  = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  const type         = hashParams.get('type')

  if (accessToken && type === 'recovery') {
    supabase.auth.setSession({
      access_token:  accessToken,
      refresh_token: refreshToken ?? ''
    }).then(({ error }) => {
      if (!error) setReady(true)
      else setError('Link non valido o scaduto. Richiedi un nuovo link.')
    })
  } else {
    // Controlla sessione esistente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else setError('Link non valido o scaduto. Richiedi un nuovo link.')
    })
  }
}, [])
    // Controlla se c'è già una sessione attiva
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    if (!password) { setError('Inserisci la nuova password'); return }
    if (password.length < 6) { setError('La password deve avere almeno 6 caratteri'); return }
    if (password !== confirmPassword) { setError('Le password non coincidono'); return }

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess('Password aggiornata! Verrai reindirizzato al login.')
    await supabase.auth.signOut()
    setTimeout(() => router.push('/login'), 2000)
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

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: '20px' }}>
      <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '420px' }}>

        <div style={{ fontSize: '26px', fontWeight: '800', color: '#c8f53a', marginBottom: '6px' }}>remate●</div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Nuova password</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '28px' }}>Scegli una nuova password per il tuo account</div>

        {!ready ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#8b93a8', fontSize: '14px' }}>
            ⏳ Verifica del link in corso...
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Nuova password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Conferma password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ripeti la password" style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleReset()} />
            </div>

            {error && (
              <div style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#e85858', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: 'rgba(56,201,122,0.1)', border: '1px solid rgba(56,201,122,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#38c97a', fontSize: '13px', marginBottom: '16px' }}>
                {success}
              </div>
            )}

            <button onClick={handleReset} disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? '#5a7a20' : '#c8f53a',
              color: '#0e1117', border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'system-ui'
            }}>
              {loading ? 'Aggiornamento...' : 'Aggiorna password'}
            </button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span onClick={() => router.push('/login')} style={{ fontSize: '13px', color: '#5b7fff', cursor: 'pointer', fontWeight: '600' }}>
            ← Torna al login
          </span>
        </div>
      </div>
    </div>
  )
}