'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useClub, useTheme } from '../club-context'

interface Stats {
  totalStudents: number
  activeStudents: number
  totalLessons: number
  totalBookings: number
  cancelledBookings: number
  byLevel: { level: string; count: number }[]
  topLessons: { title: string; bookings: number }[]
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const { activeClub } = useClub()
  const { bg, surface, surface2, border, text, textMuted, textSub, pc } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768) }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (activeClub) loadStats()
  }, [activeClub])

  async function loadStats() {
    if (!activeClub) return
    setLoading(true)

    const [
      { count: totalStudents },
      { count: activeStudents },
      { count: totalLessons },
      { count: totalBookings },
      { count: cancelledBookings },
      { data: students },
      { data: lessons },
    ] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('club_id', activeClub.id),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('club_id', activeClub.id).eq('status', 'active'),
      supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('club_id', activeClub.id).is('cancelled_at', null),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('students').select('level').eq('club_id', activeClub.id).eq('status', 'active'),
      supabase.from('lessons').select('title').eq('club_id', activeClub.id).is('cancelled_at', null),
    ])

    // Conta per livello
    const levelCount: Record<string, number> = {}
    students?.forEach((s: any) => {
      levelCount[s.level] = (levelCount[s.level] ?? 0) + 1
    })
    const byLevel = Object.entries(levelCount).map(([level, count]) => ({ level, count }))

    // Top lezioni per nome
    const lessonCount: Record<string, number> = {}
    lessons?.forEach((l: any) => {
      lessonCount[l.title] = (lessonCount[l.title] ?? 0) + 1
    })
    const topLessons = Object.entries(lessonCount)
      .map(([title, bookings]) => ({ title, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5)

    setStats({
      totalStudents:    totalStudents ?? 0,
      activeStudents:   activeStudents ?? 0,
      totalLessons:     totalLessons ?? 0,
      totalBookings:    totalBookings ?? 0,
      cancelledBookings: cancelledBookings ?? 0,
      byLevel,
      topLessons,
    })
    setLoading(false)
  }

  const levelLabel: Record<string, string> = {
    beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato'
  }
  const levelColor: Record<string, string> = {
    beginner: '#f5a623', intermediate: '#5b7fff', advanced: '#38c97a'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: pc, fontFamily: 'system-ui', background: bg }}>
      Caricamento...
    </div>
  )

  if (!stats) return null

  const totalByLevel = stats.byLevel.reduce((acc, b) => acc + b.count, 0)

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: text, background: bg, minHeight: '100vh' }}>

      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>Analytics</div>
        <div style={{ fontSize: '13px', color: textMuted, marginTop: '4px' }}>
          Statistiche per {activeClub?.name}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '14px', marginBottom: '28px' }}>
        {[
          { label: 'Alunni totali',    value: stats.totalStudents,    color: pc,        icon: '👥' },
          { label: 'Alunni attivi',    value: stats.activeStudents,   color: '#38c97a', icon: '✅' },
          { label: 'Lezioni attive',   value: stats.totalLessons,     color: '#5b7fff', icon: '📅' },
          { label: 'Prenotazioni',     value: stats.totalBookings,    color: '#f5a623', icon: '🎾' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: surface, border: `1px solid ${border}`, borderTop: `3px solid ${kpi.color}`, borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>{kpi.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '12px', color: textMuted, marginTop: '4px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>

        {/* Alunni per livello */}
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>👥 Alunni per livello</div>
          {stats.byLevel.length === 0 ? (
            <div style={{ fontSize: '13px', color: textMuted, textAlign: 'center', padding: '20px' }}>Nessun dato</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.byLevel.map(b => {
                const pct = totalByLevel > 0 ? Math.round((b.count / totalByLevel) * 100) : 0
                return (
                  <div key={b.level}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: levelColor[b.level] ?? pc }}>
                        {levelLabel[b.level] ?? b.level}
                      </span>
                      <span style={{ fontSize: '13px', color: textMuted }}>{b.count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '8px', background: surface2, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: levelColor[b.level] ?? pc, borderRadius: '4px', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Prenotazioni */}
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>📊 Prenotazioni</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Confermate', value: stats.totalBookings,     color: '#38c97a' },
              { label: 'Cancellate', value: stats.cancelledBookings, color: '#e85858' },
            ].map(item => {
              const total = stats.totalBookings + stats.cancelledBookings
              const pct   = total > 0 ? Math.round((item.value / total) * 100) : 0
              return (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: item.color }}>{item.label}</span>
                    <span style={{ fontSize: '13px', color: textMuted }}>{item.value} ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', background: surface2, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '4px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Top lezioni */}
          {stats.topLessons.length > 0 && (
            <>
              <div style={{ fontSize: '14px', fontWeight: '700', margin: '20px 0 12px' }}>🏆 Lezioni più frequenti</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.topLessons.map((l, i) => (
                  <div key={l.title} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: surface2, borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${pc}18`, color: pc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                    <div style={{ fontSize: '12px', color: textMuted, flexShrink: 0 }}>{l.bookings}x</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}