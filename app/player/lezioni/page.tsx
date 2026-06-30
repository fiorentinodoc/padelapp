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
  club_id: string
  club_name?: string
}

interface Club {
  id: string
  name: string
}

const CLUB_COLORS = ['#c8f53a', '#5b7fff', '#38c97a', '#f5a623', '#e85858']

export default function LezioniAppPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<string | null>(null)
  const [myBookings, setMyBookings] = useState<string[]>([])
  const [activeClubFilter, setActiveClubFilter] = useState<string>('all')
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

    // Tutti i club a cui è iscritto il giocatore
    const { data: studentClubs } = await supabase
      .from('student_clubs')
      .select('club_id, clubs(id, name)')
      .eq('student_id', studentData.id)

    const clubList: Club[] = studentClubs?.map((sc: any) => ({
      id:   sc.clubs.id,
      name: sc.clubs.name
    })) ?? []

    // Se non ha student_clubs usa il club principale
    if (clubList.length === 0 && studentData.club_id) {
      const { data: clubData } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('id', studentData.club_id)
        .single()
      if (clubData) clubList.push(clubData)
    }

    setClubs(clubList)

    const clubIds = clubList.map(c => c.id)
    if (clubIds.length === 0) { setLoading(false); return }

    // Lezioni disponibili di tutti i club
    const { data: lessonsData } = await supabase
      .from('lesson_availability')
      .select('*')
      .in('club_id', clubIds)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })

    // Aggiungi nome club
    const enriched = (lessonsData ?? []).map(l => ({
      ...l,
      club_name: clubList.find(c => c.id === l.club_id)?.name ?? ''
    }))
    setLessons(enriched)

    // Prenotazioni esistenti
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
    alert('Errore: ' + error.message)
  } else {
    // Manda notifica WhatsApp all'istruttore
    const lesson = lessons.find(l => l.lesson_id === lessonId)
    if (lesson) {
      const { data: clubData } = await supabase
        .from('clubs')
        .select('whatsapp_number, name')
        .eq('id', lesson.club_id)
        .single()

      if (clubData?.whatsapp_number) {
        const date    = new Date(lesson.starts_at)
        const dateStr = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
        const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

        const { data: profData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single()

        const studentName = profData ? `${profData.first_name} ${profData.last_name}` : 'Un alunno'
        const cleaned     = clubData.whatsapp_number.replace(/\s+/g, '').replace(/[^\d+]/g, '')
        const msg         = `🎾 Nuova prenotazione!\n\n*${studentName}* ha prenotato:\n📅 ${lesson.title}\n🗓 ${dateStr} alle ${timeStr}\n📍 ${lesson.court}\n\nCentro: ${clubData.name}`

        window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`, '_blank')
      }
    }
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

  const filtered = activeClubFilter === 'all'
    ? lessons
    : lessons.filter(l => l.club_id === activeClubFilter)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: '24px 20px' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>Lezioni disponibili</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>{filtered.length} lezioni in programma</div>
      </div>

      {/* Filtro per centro */}
      {clubs.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          <div
            onClick={() => setActiveClubFilter('all')}
            style={{ padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: activeClubFilter === 'all' ? '700' : '400', background: activeClubFilter === 'all' ? '#c8f53a' : '#1e2535', color: activeClubFilter === 'all' ? '#0e1117' : '#8b93a8', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Tutti
          </div>
          {clubs.map((club, i) => (
            <div key={club.id}
              onClick={() => setActiveClubFilter(club.id)}
              style={{ padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: activeClubFilter === club.id ? '700' : '400', background: activeClubFilter === club.id ? CLUB_COLORS[i % CLUB_COLORS.length] : '#1e2535', color: activeClubFilter === club.id ? '#0e1117' : '#8b93a8', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {club.name}
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📅</div>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Nessuna lezione disponibile</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a' }}>Il tuo istruttore non ha ancora programmato lezioni</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((lesson, i) => {
            const isBooked  = myBookings.includes(lesson.lesson_id)
            const isFull    = lesson.available_spots <= 0
            const isBooking = booking === lesson.lesson_id
            const date      = new Date(lesson.starts_at)
            const dateLabel = date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
            const timeLabel = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            const clubIndex = clubs.findIndex(c => c.id === lesson.club_id)
            const clubColor = CLUB_COLORS[clubIndex % CLUB_COLORS.length]

            return (
              <div key={lesson.lesson_id} style={{ background: isBooked ? 'linear-gradient(135deg, #1a2d42, #1a2540)' : '#161b27', border: `1px solid ${isBooked ? 'rgba(91,127,255,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '16px', padding: '18px', borderTop: `3px solid ${clubColor}` }}>

                {/* Club badge */}
                {clubs.length > 1 && (
                  <div style={{ fontSize: '11px', fontWeight: '700', color: clubColor, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📍 {lesson.club_name}
                  </div>
                )}

                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>{lesson.title}</div>
                    <div style={{ fontSize: '12px', color: '#8b93a8' }}>
                      📅 {dateLabel} · 🕐 {timeLabel} · {lesson.duration_min} min
                    </div>
                  </div>
                  <span style={{ background: '#1e2535', color: '#8b93a8', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', marginLeft: '8px', whiteSpace: 'nowrap' }}>
                    {levelLabel[lesson.level]}
                  </span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#8b93a8', marginBottom: '12px' }}>
                  <span>📍 {lesson.court}</span>
                  <span>👥 {lesson.booked_spots}/{lesson.max_spots} posti</span>
                </div>

                {/* Spots bar */}
                <div style={{ height: '4px', background: '#1e2535', borderRadius: '2px', marginBottom: '14px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(lesson.booked_spots / lesson.max_spots) * 100}%`, background: isFull ? '#e85858' : '#38c97a', borderRadius: '2px' }} />
                </div>

                {/* Action */}
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