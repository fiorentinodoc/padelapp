'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

type Mode = 'login' | 'register' | 'forgot'

function LoginForm() {
  const searchParams = useSearchParams()
  const joinCode     = searchParams.get('code')
  const initialMode  = (searchParams.get('mode') as Mode) ?? 'login'

  const [mode, setMode] = useState<Mode>(initialMode)
  const [isInstructor, setIsInstructor] = useState(false)
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
    setError(''); setSuccess(''); setEmail(''); setPassword('')
    setConfirmPassword(''); setFirstName(''); setLastName(''); setClubName('')
  }

  function switchMode(m: Mode) { reset(); setMode(m) }

  async function handleJoinCode(userId: string) {
    if (!joinCode) return
    const { data: joinCodeData } = await supabase
      .from('join_codes')
      .select('id, club_id, uses')
      .eq('code', joinCode)
      .eq('active', true)
      .single()

    if (!joinCodeData) return

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', userId)
      .single()

    if (student) {
      await supabase.from('student_clubs').upsert({
        student_id: student.id,
        club_id:    joinCodeData.club_id
      }, { onConflict: 'student_id,club_id' })

      await supabase.from('join_codes')
        .update({ uses: joinCodeData.uses + 1 })
        .eq('id', joinCodeData.id)
    }
  }

  async function handleLogin() {
    if (!email || !password) { setError('Compila tutti i campi'); return }
    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) { setError('Email o password non corretti'); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await handleJoinCode(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'super_admin') {
        router.push('/superadmin')
      } else if (profile?.role === 'club_admin') {
        router.push('/dashboard')
      } else {
        router.push('/player')
      }
    }
    setLoading(false)
  }

  async function handleRegister() {
    if (!firstName || !lastName || !email || !password) {
      setError('Compila tutti i campi obbligatori'); return
    }
    if (isInstructor && !clubName) {
      setError('Inserisci il nome del club'); return
    }
    if (password !== confirmPassword) { setError('Le password non coincidono'); return }
    if (password.length < 6) { setError('La password deve avere almeno 6 caratteri'); return }
    setLoading(true)
    setError('')

    const role = isInstructor ? 'club_admin' : 'student'

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name:  lastName,
          role,
          club_name:  isInstructor ? clubName : ''
        }
      }
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data.user) {
      if (isInstructor) {
        // Controlla invito
        const { data: invite } = await supabase
          .from('club_invites')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .eq('used', false)
          .single()

        if (!invite) {
          setError('La tua email non è autorizzata come istruttore. Richiedi l\'accesso prima.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        const slug = clubName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
        const { data: newClub } = await supabase
          .from('clubs')
          .insert({ name: clubName, slug, plan: 'free', max_students: 20 })
          .select()
          .single()

        if (newClub) {
          await supabase.from('profiles').update({
            first_name: firstName,
            last_name:  lastName,
            role:       'club_admin',
            club_id:    newClub.id
          }).eq('id', data.user.id)

          await supabase.from('instructor_clubs').insert({
            profile_id: data.user.id,
            club_id:    newClub.id,
            role:       'owner'
          })

          await supabase.from('club_invites')
            .update({ used: true })
            .eq('id', invite.id)
        }
      } else {
        await supabase.from('profiles').update({
          first_name: firstName,
          last_name:  lastName,
          role:       'student'
        }).eq('id', data.user.id)

        // Collega al club se c'è un codice invito
        await handleJoinCode(data.user.id)
      }

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

        <div style={{ fontSize: '26px', fontWeight: '800', color: '#c8f53a', marginBottom: '6px' }}>padel●</div>

        {joinCode && mode === 'register' && (
          <div style={{ background: 'rgba(200,245,58,0.08)', border: '1px solid rgba(200,245,58,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#c8f53a', marginBottom: '16px' }}>
            🎾 Stai accettando un invito — verrai collegato automaticamente al club!
          </div>
        )}

        <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
          {mode === 'login'    && 'Accedi al tuo account'}
          {mode === 'register' && 'Crea il tuo account'}
          {mode === 'forgot'   && 'Recupera la password'}
        </div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '28px' }}>
          {mode === 'login'    && 'Istruttore o giocatore'}
          {mode === 'register' && 'Scegli il tipo di account'}
          {mode === 'forgot'   && 'Ti mandiamo un link via email'}
        </div>

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tuaemail@esempio.it" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="La tua password" style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <span onClick={() => switchMode('forgot')}
                style={{ fontSize: '12px', color: '#5b7fff', cursor: 'pointer' }}>
                Password dimenticata?
              </span>
            </div>
            {error && <ErrorBox msg={error} />}
            {success && <SuccessBox msg={success} />}
            <button onClick={handleLogin} disabled={loading} style={primaryBtn(loading)}>
              {loading ? 'Accesso...' : 'Accedi →'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#5a5a6a' }}>
              Non hai un account?{' '}
              <span onClick={() => switchMode('register')}
                style={{ color: '#c8f53a', cursor: 'pointer', fontWeight: '600' }}>
                Registrati
              </span>
            </div>
          </>
        )}

        {/* ── REGISTRAZIONE ── */}
        {mode === 'register' && (
          <>
            {/* Toggle solo se non c'è codice invito */}
            {!joinCode && (
              <div style={{ display: 'flex', background: '#1e2535', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
                <div onClick={() => setIsInstructor(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '7px', textAlign: 'center', cursor: 'pointer', background: !isInstructor ? '#c8f53a' : 'transparent', color: !isInstructor ? '#0e1117' : '#8b93a8', fontSize: '13px', fontWeight: '700', transition: 'all 0.15s' }}>
                  👤 Sono un giocatore
                </div>
                <div onClick={() => setIsInstructor(true)}
                  style={{ flex: 1, padding: '10px', borderRadius: '7px', textAlign: 'center', cursor: 'pointer', background: isInstructor ? '#c8f53a' : 'transparent', color: isInstructor ? '#0e1117' : '#8b93a8', fontSize: '13px', fontWeight: '700', transition: 'all 0.15s' }}>
                  🎾 Sono un istruttore
                </div>
              </div>
            )}

            {isInstructor && !joinCode && (
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Nome club / academy *</label>
                <input type="text" value={clubName} onChange={e => setClubName(e.target.value)}
                  placeholder="Es: ASD Padel Roma" style={inputStyle} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="Marco" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cognome *</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Ferretti" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tuaemail@esempio.it" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Password *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Conferma password *</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ripeti la password" style={inputStyle} />
            </div>

            {!isInstructor && !joinCode && (
              <div style={{ background: 'rgba(91,127,255,0.08)', border: '1px solid rgba(91,127,255,0.15)', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#8b93a8', marginBottom: '16px', lineHeight: '1.6' }}>
                💡 Dopo la registrazione il tuo istruttore ti aggiungerà al club tramite link invito.
              </div>
            )}

            {error && <ErrorBox msg={error} />}
            {success && <SuccessBox msg={success} />}

            <button onClick={handleRegister} disabled={loading} style={primaryBtn(loading)}>
              {loading ? 'Creazione...' : joinCode ? 'Crea account e unisciti →' : isInstructor ? 'Crea account istruttore' : 'Crea account giocatore'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <span onClick={() => switchMode('login')}
                style={{ fontSize: '13px', color: '#5b7fff', cursor: 'pointer', fontWeight: '600' }}>
                ← Torna al login
              </span>
            </div>
          </>
        )}

        {/* ── RECUPERO PASSWORD ── */}
        {mode === 'forgot' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tuaemail@esempio.it" style={inputStyle} />
            </div>
            {error && <ErrorBox msg={error} />}
            {success && <SuccessBox msg={success} />}
            <button onClick={handleForgot} disabled={loading} style={primaryBtn(loading)}>
              {loading ? 'Invio...' : 'Invia link di recupero'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <span onClick={() => switchMode('login')}
                style={{ fontSize: '13px', color: '#5b7fff', cursor: 'pointer', fontWeight: '600' }}>
                ← Torna al login
              </span>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8f53a', fontFamily: 'system-ui' }}>
        Caricamento...
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

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

function primaryBtn(loading: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '14px',
    background: loading ? '#5a7a20' : '#c8f53a',
    color: '#0e1117', border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: '700',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'system-ui', marginBottom: '4px'
  }
}