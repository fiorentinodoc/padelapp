'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Booking {
  id: string
  status: string
  confirmed_at: string
  cancelled_at: string | null
  lessons: {
    id: string
    title: string
    level: string
    court: string
    starts_at: string
    duration_min: number
  }
}

export default function MieLezioniPage() {
  const [upcoming, setUpcoming] = useState<Booking[]>([])
  const [past, setPast] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!studentData) { setLoading(false); return }
    setStudent(studentData)

    // Niente ordinamento su colonna relazionata: si ordina lato client
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, lessons(*)')
      .eq('student_id', studentData.id)

    const now = new Date()
    const up: Booking[] = []
    const pa: Booking[] = []

    ;(bookings ?? []).forEach((b: any) => {
      if (!b.lessons) return
      if (new Date(b.lessons.starts_at) >= now && b.status === 'confirmed') {
        up.push(b)
      } else {
        pa.push(b)
      }
    })

    up.sort((a, b) => new Date(a.lessons.starts_at).getTime() - new Date(b.lessons.starts_at).getTime())
    pa.sort((a, b) => new Date(b.lessons.starts_at).getTime() - new Date(a.lessons.starts_at).getTime())

    setUpcoming(up)
    setPast(pa)
    setLoading(false)
  }

  async function handleCancel(booking: Booking) {
    if (!confirm('Cancellare questa prenotazione?')) return
    await supabase.from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', booking.id)
    await loadData()
  }

  const levelColor: Record<string, string> = {
    beginner: '#f5a623', intermediate: '#5b7fff', advanced: '#38c97a'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a' }}>
      Caricamento...
    </div>
  )

  const BookingCard = ({ booking, showCancel }: { booking: Booking, showCancel: boolean }) => {
    const date = new Date(booking.lessons.starts_at)
    const isPast = date < new Date()
    return (
      <div style={{ background: '#161b27', border: `1px solid ${booking.status === 'cancelled' ? 'rgba(232,88,88,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', padding: '16px', opacity: booking.status === 'cancelled' ? 0.6 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{booking.lessons.title}</div>
            <div style={{ fontSize: '12px', color: '#8b93a8' }}>
              📅 {date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })} · {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: '12px', color: '#8b93a8', marginTop: '2px' }}>
              📍 {booking.lessons.court}
            </div>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
            background: booking.status === 'cancelled' ? 'rgba(232,88,88,0.1)' : isPast ? 'rgba(255,255,255,0.06)' : 'rgba(62,230,160,0.12)',
            color: booking.status === 'cancelled' ? '#e85858' : isPast ? '#8b93a8' : '#3ee6a0',
            marginLeft: '8px', whiteSpace: 'nowrap'
          }}>
            {booking.status === 'cancelled' ? 'Cancellata' : isPast ? '✓ Svolta' : '✓ Confermata'}
          </span>
        </div>
        {showCancel && booking.status === 'confirmed' && (
          <button onClick={() => handleCancel(booking)}
            style={{ width: '100%', background: 'rgba(232,88,88,0.08)', border: '1px solid rgba(232,88,88,0.2)', borderRadius: '8px', padding: '8px', fontSize: '13px', color: '#e85858', cursor: 'pointer', fontWeight: '600', marginTop: '4px' }}>
            Cancella prenotazione
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 20px' }}>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>Le mie lezioni</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>{upcoming.length} prossime · {past.length} passate</div>
      </div>

      {/* Prossime */}
      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Prossime
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
            {upcoming.map(b => <BookingCard key={b.id} booking={b} showCancel={true} />)}
          </div>
        </>
      )}

      {upcoming.length === 0 && (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Nessuna lezione prenotata</div>
          <button onClick={() => router.push('/player/lezioni')}
            style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginTop: '12px' }}>
            Prenota ora
          </button>
        </div>
      )}

      {/* Passate */}
      {past.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Storico
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {past.map(b => <BookingCard key={b.id} booking={b} showCancel={false} />)}
          </div>
        </>
      )}
    </div>
  )
}