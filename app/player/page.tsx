'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Lesson {
  id: string
  title: string
  level: string
  court: string
  starts_at: string
  duration_min: number
  max_spots: number
}

interface Booking {
  id: string
  status: string
  lesson_id: string
  lessons: Lesson
}

export default function AppHome() {
  const [profile, setProfile] = useState<any>(null)
  const [nextLesson, setNextLesson] = useState<Booking | null>(null)
  const [freeLesson, setFreeLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Profilo
    const { data: prof } = await supabase
      .from('profiles')
      .select('first_name, last_name, club_id')
      .eq('id', user.id)
      .single()
    setProfile(prof)

    // Student record
    const { data: student } = await supabase
      .from('students')
      .select('id, level, club_id')
      .eq('profile_id', user.id)
      .single()

    if (student) {
      // Prossima lezione prenotata
      const now = new Date().toISOString()
const { data: bookings } = await supabase
  .from('bookings')
  .select('*, lessons!inner(*)')
  .eq('student_id', student.id)
  .eq('status', 'confirmed')
  .gte('lessons.starts_at', now)
  .order('lessons(starts_at)', { ascending: true })
  .limit(1)

      if (bookings && bookings.length > 0) {
        setNextLesson(bookings[0] as any)
      }

      // Lezione con posto libero dello stesso livello
      const { data: freeLessons } = await supabase
        .from('lesson_availability')
        .select('*')
        .eq('club_id', student.club_id)
        .eq('level', student.level)
        .gt('available_spots', 0)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)

      if (freeLessons && freeLessons.length > 0) {
        setFreeLesson(freeLessons[0] as any)
      }
    }

    setLoading(false)
  }

  const levelLabel: Record<string, string> = {
    beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: '24px 20px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '4px' }}>Benvenuto,</div>
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff' }}>
          {profile?.first_name} {profile?.last_name} 👋
        </div>
      </div>

      {/* Notifica posto libero */}
      {freeLesson && (
        <div
          onClick={() => router.push(`/player/lezioni`)}
          style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <div style={{ fontSize: '22px' }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f5a623', marginBottom: '2px' }}>Posto libero!</div>
            <div style={{ fontSize: '12px', color: '#8b93a8' }}>
              {freeLesson.title} · {new Date(freeLesson.starts_at).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#f5a623', background: 'rgba(245,166,35,0.15)', padding: '4px 10px', borderRadius: '8px' }}>
            Prenota
          </div>
        </div>
      )}

      {/* Prossima lezione */}
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        Prossima lezione
      </div>

      {nextLesson ? (
        <div style={{ background: 'linear-gradient(135deg, #1a2d42, #1a2540)', border: '1px solid rgba(91,127,255,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '80px', opacity: 0.06 }}>🎾</div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#5b7fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            {new Date(nextLesson.lessons.starts_at).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>{nextLesson.lessons.title}</div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#8b93a8', marginBottom: '16px' }}>
            <span>🕐 {new Date(nextLesson.lessons.starts_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>📍 {nextLesson.lessons.court}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, background: 'rgba(62,230,160,0.15)', border: '1px solid rgba(62,230,160,0.3)', borderRadius: '10px', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#3ee6a0' }}>
              ✓ Confermata
            </div>
            <button
              onClick={async () => {
                if (!confirm('Cancellare questa prenotazione?')) return
                await supabase.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', nextLesson.id)
                await loadData()
              }}
              style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.2)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', color: '#e85858', cursor: 'pointer', fontWeight: '600' }}>
              Cancella
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎾</div>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Nessuna lezione prenotata</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '20px' }}>Prenota la tua prossima lezione</div>
          <button onClick={() => router.push('/player/lezioni')}
            style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            Vedi lezioni disponibili
          </button>
        </div>
      )}

      {/* Azioni rapide */}
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        Azioni rapide
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { icon: '📅', label: 'Prenota lezione',  path: '/player/lezioni',      color: '#c8f53a', text: '#0e1117' },
          { icon: '🎾', label: 'Le mie lezioni',   path: '/player/mie-lezioni',  color: '#1e2535', text: '#fff' },
        ].map(item => (
          <div key={item.path} onClick={() => (item.path)}
            style={{ background: item.color, borderRadius: '14px', padding: '18px 16px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: item.text }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}