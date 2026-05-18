'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RichiediAccessoPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    club_name: '',
    city: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit() {
    if (!form.first_name || !form.last_name || !form.email || !form.club_name) {
      setError('Compila tutti i campi obbligatori')
      return
    }
    setLoading(true)
    setError('')

    // Salva la richiesta nel database
    const { error: insertError } = await supabase
      .from('access_requests')
      .insert({
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        phone:      form.phone || null,
        club_name:  form.club_name,
        city:       form.city || null,
        message:    form.message || null,
        status:     'pending'
      })

    if (insertError) {
      setError('Errore: ' + insertError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
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

  if (success) return (
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: '20px' }}>
      <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '460px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '20px' }}>🎾</div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginBottom: '10px' }}>Richiesta inviata!</div>
        <div style={{ fontSize: '14px', color: '#8b93a8', lineHeight: '1.6', marginBottom: '28px' }}>
          Abbiamo ricevuto la tua richiesta. Ti contatteremo entro 24 ore per completare l'attivazione del tuo account.
        </div>
        <div style={{ background: 'rgba(200,245,58,0.08)', border: '1px solid rgba(200,245,58,0.2)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#c8f53a' }}>
          ✓ Controlla la tua email — riceverai un link per registrarti non appena il tuo account sarà approvato.
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: '20px' }}>
      <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '460px' }}>

        {/* Logo */}
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#c8f53a', marginBottom: '6px' }}>padel●</div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Richiedi accesso</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '28px', lineHeight: '1.6' }}>
          Compila il form e ti contatteremo entro 24 ore per attivare il tuo account istruttore.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>Nome *</label>
            <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
              placeholder="Marco" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Cognome *</label>
            <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
              placeholder="Ferretti" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Email *</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="tuaemail@esempio.it" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Telefono</label>
          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="+39 333 1234567" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Nome club / academy *</label>
          <input value={form.club_name} onChange={e => setForm({ ...form, club_name: e.target.value })}
            placeholder="Es: ASD Padel Roma" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Città</label>
          <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
            placeholder="Es: Roma" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Messaggio (opzionale)</label>
          <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
            placeholder="Raccontaci qualcosa del tuo club..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {error && (
          <div style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#e85858', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '14px',
          background: loading ? '#5a7a20' : '#c8f53a',
          color: '#0e1117', border: 'none', borderRadius: '10px',
          fontSize: '15px', fontWeight: '700',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'system-ui', marginBottom: '16px'
        }}>
          {loading ? 'Invio...' : 'Invia richiesta →'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '13px', color: '#5a5a6a' }}>
          Hai già un account?{' '}
          <a href="/login" style={{ color: '#c8f53a', fontWeight: '600', textDecoration: 'none' }}>Accedi</a>
        </div>

      </div>
    </div>
  )
}