'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useClub } from '../club-context'

export default function AbbonamentoPage() {
  const [isMobile, setIsMobile] = useState(false)
  const { activeClub } = useClub()
  const router = useRouter()
  const supabase = createClient()

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
      color: '#8b93a8',
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
      color: '#c8f53a',
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
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: '#fff' }}>

      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>Abbonamento</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>
          Gestisci il tuo piano — attualmente su <strong style={{ color: '#fff' }}>Piano {activeClub?.plan ?? 'free'}</strong>
        </div>
      </div>

      {/* Piani */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {plans.map(plan => (
          <div key={plan.name} style={{
            background: plan.current ? `${plan.color}08` : '#161b27',
            border: `1px solid ${plan.current ? plan.color : 'rgba(255,255,255,0.06)'}`,
            borderTop: `3px solid ${plan.color}`,
            borderRadius: '16px', padding: '24px',
            position: 'relative'
          }}>
            {plan.current && (
              <div style={{ position: 'absolute', top: '-1px', right: '16px', background: plan.color, color: '#0e1117', fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '0 0 8px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Piano attuale
              </div>
            )}

            <div style={{ fontSize: '18px', fontWeight: '800', color: plan.color, marginBottom: '4px' }}>{plan.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
              <span style={{ fontSize: '32px', fontWeight: '800', color: '#fff' }}>{plan.price}</span>
              <span style={{ fontSize: '13px', color: '#5a5a6a' }}>{plan.period}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#8b93a8' }}>
                  <span style={{ color: plan.color, fontWeight: '700', flexShrink: 0 }}>✓</span>
                  {f}
                </div>
              ))}
              {plan.limits.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#5a5a6a' }}>
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
              <button
                onClick={() => handleUpgrade(plan.name)}
                style={{ width: '100%', padding: '12px', background: plan.color, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', color: plan.name === 'Pro' ? '#0e1117' : '#fff', cursor: 'pointer' }}>
                {plan.cta} →
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {/* Info upgrade */}
      <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>💬 Come fare l'upgrade</div>
        <div style={{ fontSize: '13px', color: '#8b93a8', lineHeight: '1.7', marginBottom: '16px' }}>
          Per passare a un piano superiore clicca il bottone del piano desiderato — si aprirà WhatsApp con un messaggio pre-compilato. Ti risponderemo entro poche ore per attivare il tuo nuovo piano.
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(56,201,122,0.08)', border: '1px solid rgba(56,201,122,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#38c97a' }}>
            ✓ Attivazione entro 24h
          </div>
          <div style={{ background: 'rgba(56,201,122,0.08)', border: '1px solid rgba(56,201,122,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#38c97a' }}>
            ✓ Nessun contratto
          </div>
          <div style={{ background: 'rgba(56,201,122,0.08)', border: '1px solid rgba(56,201,122,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#38c97a' }}>
            ✓ Disdetta in qualsiasi momento
          </div>
        </div>
      </div>

    </div>
  )
}