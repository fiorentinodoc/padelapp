'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [clubName, setClubName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setSuccess('')

    if (isRegister) {
      // Registrazione nuovo istruttore
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { club_name: clubName }
        }
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Crea il club
      if (data.user) {
        const slug = clubName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')

        const { error: clubError } = await supabase
          .from('clubs')
          .insert({
            name: clubName,
            slug: slug,
            plan: 'free',
            max_students: 20
          })

        if (clubError) {
          setError('Errore nella creazione del club: ' + clubError.message)
          setLoading(false)
          return
        }

        setSuccess('Account creato! Controlla la tua email per confermare.')
      }
    } else {
      // Login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (loginError) {
        setError('Email o password non corretti')
        setLoading(false)
        return
      }

      router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: '#161b27',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px'
      }}>
        {/* Logo */}
        <div style={{
          fontSize: '26px',
          fontWeight: '800',
          color: '#c8f53a',
          marginBottom: '8px',
          letterSpacing: '-0.5px'
        }}>
          padel●
        </div>
        <div style={{ fontSize: '14px', color: '#5a5a6a', marginBottom: '32px' }}>
          {isRegister ? 'Crea il tuo account istruttore' : 'Accedi alla dashboard'}
        </div>

        {/* Form */}
        {isRegister && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Nome club / academy
            </label>
            <input
              type="text"
              value={clubName}
              onChange={e => setClubName(e.target.value)}
              placeholder="Es: ASD Padel Roma"
              style={{
                width: '100%', padding: '12px 14px',
                background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', color: '#fff', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tuaemail@esempio.it"
            style={{
              width: '100%', padding: '12px 14px',
              background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', color: '#fff', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimo 6 caratteri"
            style={{
              width: '100%', padding: '12px 14px',
              background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', color: '#fff', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Errore / Successo */}
        {error && (
          <div style={{
            background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)',
            borderRadius: '10px', padding: '12px 14px',
            color: '#e85858', fontSize: '13px', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: 'rgba(56,201,122,0.1)', border: '1px solid rgba(56,201,122,0.3)',
            borderRadius: '10px', padding: '12px 14px',
            color: '#38c97a', fontSize: '13px', marginBottom: '16px'
          }}>
            {success}
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: loading ? '#5a7a20' : '#c8f53a',
            color: '#0e1117', border: 'none', borderRadius: '10px',
            fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '20px', transition: 'all 0.2s'
          }}
        >
          {loading ? 'Caricamento...' : isRegister ? 'Crea account' : 'Accedi'}
        </button>

        {/* Toggle login/register */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#5a5a6a' }}>
          {isRegister ? 'Hai già un account?' : 'Non hai un account?'}{' '}
          <span
            onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess('') }}
            style={{ color: '#c8f53a', cursor: 'pointer', fontWeight: '600' }}
          >
            {isRegister ? 'Accedi' : 'Registrati'}
          </span>
        </div>
      </div>
    </div>
  )
}