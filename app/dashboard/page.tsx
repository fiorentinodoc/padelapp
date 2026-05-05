'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [club, setClub] = useState<any>(null)
  const [stats, setStats] = useState({ lessons: 0, students: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('club_id, clubs(id, name, plan)')
        .eq('id', user.id)
        .single()

      if (profile?.clubs) {
        const c = profile.clubs as any
        setClub(c)

        // Conta lezioni
        const { count: lessonsCount } = await supabase
          .from('lessons')
          .select('id', { count: 'exact', head: true })
          .eq('club_id', c.id)
          .is('cancelled_at', null)

        // Conta alunni
        const { count: studentsCount } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('club_id', c.id)
          .eq('status', 'active')

        setStats({ lessons: lessonsCount ?? 0, students: studentsCount ?? 0 })
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui', color: '#fff' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '6px' }}>Benvenuto,</div>
        <div style={{ fontSize: '28px', fontWeight: '800' }}>
          {club?.name ?? 'Il tuo club'} 🎾
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px', maxWidth: '700px' }}>
        {[
          { label: 'Lezioni attive',   value: stats.lessons,  color: '#c8f53a', icon: '📅' },
          { label: 'Alunni attivi',    value: stats.students, color: '#5b7fff', icon: '👥' },
          { label: 'Notifiche push',   value: '✓',            color: '#38c97a', icon: '🔔' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: '#161b27',
            border: `1px solid rgba(255,255,255,0.06)`,
            borderTop: `3px solid ${kpi.color}`,
            borderRadius: '14px', padding: '20px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{kpi.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '12px', color: '#5a5a6a', marginTop: '4px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Azioni rapide */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Azioni rapide</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '500px' }}>
          {[
            { label: '+ Nuova lezione',  path: '/dashboard/lezioni',   color: '#c8f53a', text: '#0e1117' },
            { label: '+ Aggiungi alunno', path: '/dashboard/alunni',   color: '#1e2535', text: '#fff' },
            { label: 'Vedi analytics',   path: '/dashboard/analytics', color: '#1e2535', text: '#fff' },
            { label: 'Invia notifica',   path: '/dashboard/notifiche', color: '#1e2535', text: '#fff' },
          ].map((btn, i) => (
            <div
              key={i}
              onClick={() => router.push(btn.path)}
              style={{
                background: btn.color, color: btn.text,
                padding: '14px 18px', borderRadius: '12px',
                fontSize: '14px', fontWeight: '700',
                cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.15s'
              }}
            >
              {btn.label}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}