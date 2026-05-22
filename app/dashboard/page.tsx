'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useClub, useTheme } from './club-context'

export default function DashboardPage() {
  const [stats, setStats] = useState({ lessons: 0, students: 0 })
  const [loading, setLoading] = useState(true)
  const { activeClub } = useClub()
  const { bg, surface, border, text, textMuted, textSub, pc } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!activeClub) return
    loadStats()
  }, [activeClub])

  async function loadStats() {
    if (!activeClub) return

    const { count: lessonsCount } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', activeClub.id)
      .is('cancelled_at', null)

    const { count: studentsCount } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', activeClub.id)
      .eq('status', 'active')

    setStats({ lessons: lessonsCount ?? 0, students: studentsCount ?? 0 })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: pc, fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui', color: text, background: bg, minHeight: '100vh' }}>

      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '13px', color: textMuted, marginBottom: '6px' }}>Centro attivo</div>
        <div style={{ fontSize: '28px', fontWeight: '800' }}>
          {activeClub?.name ?? 'Seleziona un centro'} 🎾
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px', maxWidth: '700px' }}>
        {[
          { label: 'Lezioni attive',  value: stats.lessons,  color: pc,         icon: '📅' },
          { label: 'Alunni attivi',   value: stats.students, color: '#5b7fff',  icon: '👥' },
          { label: 'Notifiche push',  value: '✓',            color: '#38c97a',  icon: '🔔' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: surface, border: `1px solid ${border}`, borderTop: `3px solid ${kpi.color}`, borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{kpi.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '12px', color: textMuted, marginTop: '4px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Azioni rapide</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '500px' }}>
          {[
            { label: '+ Nuova lezione',   path: '/dashboard/lezioni',   bg: pc,      color: '#0e1117' },
            { label: '+ Aggiungi alunno', path: '/dashboard/alunni',    bg: surface, color: text },
            { label: 'Vedi analytics',    path: '/dashboard/analytics', bg: surface, color: text },
            { label: 'Invia notifica',    path: '/dashboard/notifiche', bg: surface, color: text },
          ].map((btn, i) => (
            <div key={i} onClick={() => router.push(btn.path)}
              style={{ background: btn.bg, color: btn.color, padding: '14px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', border: `1px solid ${border}` }}>
              {btn.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}