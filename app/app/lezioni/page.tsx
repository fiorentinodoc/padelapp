'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Lesson {
  lesson_id: string
  title: string
  level: string
  court: string
  starts_at: string
  duration_min: number
  max_spots: number
  booked_spots: number
  available_spots: number
}

export default function LezioniAppPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<string | null>(null)
  const [myBookings, setMyBookings] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: studentData } = await supabase
      .from('students')
      .select('id, level, club_id')
      .eq('profile_id', user.id)
      .single()

    if (!studentData) { setLoading(false); return }
    setStudent(studentData)

    // Lezioni disponibili del club
    const { data: lessonsData } = await supabase
      .from('lesson_availability')
      .select('*')
      .eq('club_id', studentData.club_id)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })

    setLessons(lessonsData ?? [])

    // Prenotazioni esistenti dell'alunno
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('lesson_id')
      .eq('student_id', studentData.id)
      .eq('status', 'confirmed')

    setMyBookings(bookingsData?.map((b: any) => b.lesson_id) ?? [])
    setLoading(false)
  }

  async function handleBook(lessonId: string) {
    if (!student) return
    setBooking(lessonId)

    const { error } = await supabase.from('bookings').insert({
      lesson_id:    lessonId,
      student_id:   student.id,
      status:       'confirmed',
      confirmed_at: new Date().toISOString()
    })

    if (error) {
      alert('Errore nella prenotazione: ' + error.message)
    } else {
      await loadData()
    }
    setBooking(null)
  }

  async function handleCancel(lessonId: string) {
    if (!student) return
    if (!confirm('Cancellare la prenotazione?')) return

    await supabase.from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('lesson_id', lessonId)
      .eq('student_id', student.id)

    await loadData()
  }

  const levelLabel: Record<string, string> = {
    beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato'
  }
  const levelColor: Record<string, string> = {
    beginner: '#f5a623', intermediate: '#5b7fff', advanced: '#38c97a'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: '24px 20px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>Lezioni disponibili</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>{lessons.length} lezioni in programma</div>
      </div>

      {lessons.length === 0 ? (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📅</div>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Nessuna lezione disponibile</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a' }}>Il tuo istruttore non ha ancora programmato lezioni</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lessons.map(lesson => {
            const isBooked   = myBookings.includes(lesson.lesson_id)
            const isFull     = lesson.available_spots <= 0
            const isBooking  = booking === lesson.lesson_id
            const date       = new Date(lesson.starts_at)
            const dateLabel  = date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
            const timeLabel  = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

            return (
              <div key={lesson.lesson_id} style={{ background: isBooked ? 'linear-gradient(135deg, #1a2d42, #1a2540)' : '#161b27', border: `1px solid ${isBooked ? 'rgba(91,127,255,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '16px', padding: '18px' }}>

                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>{lesson.title}</div>
                    <div style={{ fontSize: '12px', color: '#8b93a8' }}>
                      📅 {dateLabel} · 🕐 {timeLabel} · {lesson.duration_min} min
                    </div>
                  </div>
                  <span style={{ background: `${levelColor[lesson.level]}18`, color: levelColor[lesson.level], border: `1px solid ${levelColor[lesson.level]}40`, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {levelLabel[lesson.level]}
                  </span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#8b93a8', marginBottom: '14px' }}>
                  <span>📍 {lesson.court}</span>
                  <span>👥 {lesson.booked_spots}/{lesson.max_spots} posti</span>
                </div>

                {/* Spots bar */}
                <div style={{ height: '4px', background: '#1e2535', borderRadius: '2px', marginBottom: '14px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(lesson.booked_spots / lesson.max_spots) * 100}%`, background: isFull ? '#e85858' : '#38c97a', borderRadius: '2px', transition: 'width 0.3s' }} />
                </div>

                {/* Action button */}
                {isBooked ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, background: 'rgba(62,230,160,0.12)', border: '1px solid rgba(62,230,160,0.25)', borderRadius: '10px', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#3ee6a0' }}>
                      ✓ Prenotata
                    </div>
                    <button onClick={() => handleCancel(lesson.lesson_id)}
                      style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.2)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', color: '#e85858', cursor: 'pointer', fontWeight: '600' }}>
                      Cancella
                    </button>
                  </div>
                ) : isFull ? (
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', textAlign: 'center', fontSize: '13px', color: '#5a5a6a', fontWeight: '600' }}>
                    Completo
                  </div>
                ) : (
                  <button onClick={() => handleBook(lesson.lesson_id)} disabled={!!booking}
                    style={{ width: '100%', background: isBooking ? '#5a7a20' : '#c8f53a', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '700', color: '#0e1117', cursor: booking ? 'not-allowed' : 'pointer' }}>
                    {isBooking ? 'Prenotazione...' : '+ Prenota questo posto'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}