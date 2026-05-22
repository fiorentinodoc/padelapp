'use client'

import { useEffect, useState } from 'react'
import { useClub, useTheme } from '../club-context'

export default function AbbonamentoPage() {
  const [isMobile, setIsMobile] = useState(false)
  const { activeClub } = useClub()
  const { bg, surface, surface2, border, text, textSub, textMuted, pc } = useTheme()

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768) }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
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
    const message = `Ciao! Vorrei passare al piano ${planName} per il club ${activeClub?.name}. Come posso procedere?`
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

      {/* Piani */}
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
              <div style={{ position: 'absolute', top: '-1px', right: '16px', background: plan.color, color: plan.name === 'Pro' ? '#0e1117' : '#fff', fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '0 0 8px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Piano attuale
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

      {/* Info upgrade */}
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: text }}>💬 Come fare l'upgrade</div>
        <div style={{ fontSize: '13px', color: textSub, lineHeight: '1.7', marginBottom: '16px' }}>
          Per passare a un piano superiore clicca il bottone del piano desiderato — si aprirà WhatsApp con un messaggio pre-compilato. Ti risponderemo entro poche ore per attivare il tuo nuovo piano.
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