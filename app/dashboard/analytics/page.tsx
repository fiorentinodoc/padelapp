'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalLessons: 0,
    totalBookings: 0,
    cancelledBookings: 0,
    byLevel: { beginner: 0, intermediate: 0, advanced: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768) }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .single()

    if (!profile?.club_id) { setLoading(false); return }
    const clubId = profile.club_id

    const [
      { count: totalStudents },
      { count: activeStudents },
      { count: totalLessons },
      { count: totalBookings },
      { count: cancelledBookings },
      { count: beginner },
      { count: intermediate },
      { count: advanced },
    ] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('club_id', clubId),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'active'),
      supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('club_id', clubId).is('cancelled_at', null),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('level', 'beginner'),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('level', 'intermediate'),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('level', 'advanced'),
    ])

    setStats({
      totalStudents:     totalStudents ?? 0,
      activeStudents:    activeStudents ?? 0,
      totalLessons:      totalLessons ?? 0,
      totalBookings:     totalBookings ?? 0,
      cancelledBookings: cancelledBookings ?? 0,
      byLevel: {
        beginner:     beginner ?? 0,
        intermediate: intermediate ?? 0,
        advanced:     advanced ?? 0,
      }
    })
    setLoading(false)
  }

  const presenceRate = stats.totalBookings > 0
    ? Math.round(((stats.totalBookings - stats.cancelledBookings) / stats.totalBookings) * 100)
    : 0

  const total = stats.byLevel.beginner + stats.byLevel.intermediate + stats.byLevel.advanced || 1

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: '#fff' }}>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>Analytics</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>Panoramica del tuo club</div>
      </div>

      {/* KPI — 2 colonne su mobile, 4 su desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Alunni totali',  value: stats.totalStudents,  color: '#c8f53a', icon: '👥' },
          { label: 'Alunni attivi',  value: stats.activeStudents, color: '#5b7fff', icon: '✅' },
          { label: 'Lezioni attive', value: stats.totalLessons,   color: '#38c97a', icon: '📅' },
          { label: 'Tasso presenze', value: `${presenceRate}%`,   color: '#f5a623', icon: '📊' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderTop: `3px solid ${kpi.color}`, borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{kpi.icon}</div>
            <div style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: '800', color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '11px', color: '#5a5a6a', marginTop: '4px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Grafici — colonna singola su mobile, due colonne su desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>

        {/* Distribuzione livelli */}
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '20px' }}>Distribuzione per livello</div>
          {[
            { label: 'Principianti', value: stats.byLevel.beginner,    color: '#f5a623' },
            { label: 'Intermedi',    value: stats.byLevel.intermediate, color: '#5b7fff' },
            { label: 'Avanzati',     value: stats.byLevel.advanced,     color: '#38c97a' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', color: '#8b93a8', width: '90px', flexShrink: 0 }}>{item.label}</div>
              <div style={{ flex: 1, height: '8px', background: '#1e2535', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round((item.value / total) * 100)}%`, background: item.color, borderRadius: '4px' }} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', width: '20px', textAlign: 'right' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Prenotazioni */}
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Prenotazioni</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Totali',      value: stats.totalBookings,                          color: '#fff' },
              { label: 'Cancellate',  value: stats.cancelledBookings,                      color: '#e85858' },
              { label: 'Confermate',  value: stats.totalBookings - stats.cancelledBookings, color: '#38c97a' },
              { label: 'Tasso conf.', value: `${presenceRate}%`,                           color: '#c8f53a' },
            ].map(item => (
              <div key={item.label} style={{ background: '#1e2535', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '11px', color: '#5a5a6a', marginTop: '3px' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}