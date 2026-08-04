'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useClub, useTheme } from '../club-context'

export default function AbbonamentoPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [instructorName, setInstructorName] = useState('')
  const { activeClub } = useClub()
  const { bg, surface, surface2, border, text, textSub, textMuted, pc } = useTheme()
  const supabase = createClient()

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768) }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    async function loadInstructor() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()
      if (profile) {
        setInstructorName([profile.first_name, profile.last_name].filter(Boolean).join(' '))
      }
    }
    loadInstructor()
  }, [])

  const plans = [
    {
      name: 'Free',
      price: '€0',
      period: 'per sempre',
      color: textMuted,
      features: [
        '1 centro',
        'Max 20 alunni',
        'Calendario lezioni',
        'Link invito alunni',
        'Notifiche WhatsApp manuali',
      ],
      limits: [
        'Nessuna notifica automatica',
        'Nessun analytics avanzato',
      ],
      cta: null,
      current: activeClub?.plan === 'free'
    },
    {
      name: 'Starter',
      price: '€29',
      period: 'al mese',
      color: '#5b7fff',
      features: [
        'Fino a 3 centri',
        'Max 100 alunni',
        'Tutto il piano Free +',
        'Notifiche WhatsApp automatiche',
        'Analytics base',
        'Supporto email prioritario',
      ],
      limits: [],
      cta: 'Passa a Starter',
      current: activeClub?.plan === 'starter'
    },
    {
      name: 'Pro',
      price: '€69',
      period: 'al mese',
      color: pc,
      features: [
        'Centri illimitati',
        'Alunni illimitati',
        'Tutto lo Starter +',
        'Collaboratori per centro',
        'Analytics avanzate',
        'Supporto prioritario',
      ],
      limits: [],
      cta: 'Passa a Pro',
      current: activeClub?.plan === 'pro'
    }
  ]

  function handleUpgrade(planName: string) {
    const name    = instructorName || 'un istruttore'
    const message = `Ciao! Sono ${name} e vorrei passare al piano ${planName}. Come posso procedere?`
    window.open(`https://wa.me/393395889666?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: text, background: bg, minHeight: '100vh' }}>

      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>Abbonamento</div>
        <div style={{ fontSize: '13px', color: textMuted, marginTop: '4px' }}>
          Gestisci il tuo piano — attualmente su <strong style={{ color: text }}>Piano {activeClub?.plan ?? 'free'}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {plans.map(plan => (
          <div key={plan.name} style={{
            background: plan.current ? `${plan.color}08` : surface,
            border: `1px solid ${plan.current ? plan.color : border}`,
            borderTop: `3px solid ${plan.color}`,
            borderRadius: '16px', padding: '24px',
            position: 'relative'
          }}>
            {plan.current && (
  <div>
    <div style={{ width: '100%', padding: '12px', background: `${plan.color}15`, border: `1px solid ${plan.color}30`, borderRadius: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: plan.color, marginBottom: plan.name !== 'Free' && activeClub?.plan_expires_at ? '8px' : '0' }}>
      Piano attivo
    </div>
    {plan.name !== 'Free' && activeClub?.plan_expires_at && (() => {
      const expiry = new Date((activeClub as any).plan_expires_at)
      const diff   = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const color  = diff < 0 ? '#e85858' : diff <= 7 ? '#f5a623' : '#38c97a'
      const label  = diff < 0
        ? `⚠️ Scaduto il ${expiry.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : diff === 0
        ? '⚠️ Scade oggi'
        : `✓ Scade il ${expiry.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} (tra ${diff} giorni)`
      return (
        <div style={{ fontSize: '12px', color, fontWeight: '600', textAlign: 'center', padding: '6px 10px', background: `${color}10`, border: `1px solid ${color}30`, borderRadius: '8px' }}>
          {label}
        </div>
      )
    })()}
  </div>
)}

            <div style={{ fontSize: '18px', fontWeight: '800', color: plan.color, marginBottom: '4px' }}>{plan.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
              <span style={{ fontSize: '32px', fontWeight: '800', color: text }}>{plan.price}</span>
              <span style={{ fontSize: '13px', color: textMuted }}>{plan.period}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: textSub }}>
                  <span style={{ color: plan.color, fontWeight: '700', flexShrink: 0 }}>✓</span>
                  {f}
                </div>
              ))}
              {plan.limits.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: textMuted }}>
                  <span style={{ flexShrink: 0 }}>✗</span>
                  {f}
                </div>
              ))}
            </div>

            {plan.current ? (
              <div style={{ width: '100%', padding: '12px', background: `${plan.color}15`, border: `1px solid ${plan.color}30`, borderRadius: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: plan.color }}>
                Piano attivo
              </div>
            ) : plan.cta ? (
              <button onClick={() => handleUpgrade(plan.name)}
                style={{ width: '100%', padding: '12px', background: plan.color, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', color: plan.name === 'Pro' ? '#0e1117' : '#fff', cursor: 'pointer' }}>
                {plan.cta} →
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: text }}>💬 Come fare l'upgrade</div>
        <div style={{ fontSize: '13px', color: textSub, lineHeight: '1.7', marginBottom: '16px' }}>
          Per passare a un piano superiore clicca il bottone del piano desiderato — si aprirà WhatsApp con un messaggio pre-compilato con il tuo nome. Ti risponderemo entro poche ore per attivare il tuo nuovo piano.
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {['✓ Attivazione entro 24h', '✓ Nessun contratto', '✓ Disdetta in qualsiasi momento'].map(item => (
            <div key={item} style={{ background: 'rgba(56,201,122,0.08)', border: '1px solid rgba(56,201,122,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#38c97a' }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}