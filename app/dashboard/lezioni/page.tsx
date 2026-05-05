'use client'

import { useEffect, useState, useCallback } from 'react'
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
  recurrence: string | null
  club_id: string
  club_name?: string
}

interface Club {
  id: string
  name: string
}

const CLUB_COLORS = [
  '#c8f53a', '#5b7fff', '#38c97a', '#f5a623', '#e85858', '#a78bfa'
]

const HOURS = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]
const DAYS  = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']

export default function LezioniPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [clubColors, setClubColors] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'week'|'month'>('week')
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()))
  const [monthDate, setMonthDate] = useState<Date>(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [form, setForm] = useState({
    title: '', level: 'intermediate', court: '',
    date: '', time: '', duration_min: '90',
    max_spots: '4', recurrence: 'none', club_id: ''
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768) }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => { loadData() }, [weekStart, monthDate, view])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: ic } = await supabase
      .from('instructor_clubs')
      .select('clubs(id, name)')
      .eq('profile_id', user.id)

    const clubList: Club[] = ic?.map((c: any) => ({ id: c.clubs.id, name: c.clubs.name })) ?? []
    setClubs(clubList)

    const colors: Record<string,string> = {}
    clubList.forEach((c, i) => { colors[c.id] = CLUB_COLORS[i % CLUB_COLORS.length] })
    setClubColors(colors)

    // Range date da caricare
    let from: Date, to: Date
    if (view === 'week') {
      from = new Date(weekStart)
      to   = new Date(weekStart); to.setDate(to.getDate() + 7)
    } else {
      from = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      to   = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    }

    const clubIds = clubList.map(c => c.id)
    if (clubIds.length === 0) { setLoading(false); return }

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .in('club_id', clubIds)
      .gte('starts_at', from.toISOString())
      .lte('starts_at', to.toISOString())
      .is('cancelled_at', null)
      .order('starts_at', { ascending: true })

    const enriched = (lessonsData ?? []).map(l => ({
      ...l,
      club_name: clubList.find(c => c.id === l.club_id)?.name ?? ''
    }))
    setLessons(enriched)
    setLoading(false)
  }

  function openNew(date: string, time: string) {
    setEditingLesson(null)
    setForm({
      title: '', level: 'intermediate', court: '',
      date, time, duration_min: '90',
      max_spots: '4', recurrence: 'none',
      club_id: clubs[0]?.id ?? ''
    })
    setError('')
    setShowModal(true)
  }

  function openEdit(lesson: Lesson) {
    setEditingLesson(lesson)
    const d = new Date(lesson.starts_at)
    setForm({
      title:        lesson.title,
      level:        lesson.level,
      court:        lesson.court,
      date:         d.toISOString().split('T')[0],
      time:         d.toTimeString().slice(0,5),
      duration_min: String(lesson.duration_min),
      max_spots:    String(lesson.max_spots),
      recurrence:   lesson.recurrence ?? 'none',
      club_id:      lesson.club_id
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    console.log('Form data:', form)
    if (!form.title || !form.court || !form.date || !form.time || !form.club_id) {
      setError('Compila tutti i campi obbligatori'); return
    }
    setSaving(true)
    setError('')
    const starts_at = new Date(`${form.date}T${form.time}:00`).toISOString()
    const payload = {
      title: form.title, level: form.level, court: form.court,
      starts_at, duration_min: parseInt(form.duration_min),
      max_spots: parseInt(form.max_spots),
      recurrence: form.recurrence === 'none' ? null : form.recurrence,
      club_id: form.club_id
    }

    if (editingLesson) {
      await supabase.from('lessons').update(payload).eq('id', editingLesson.id)
    } else {
      await supabase.from('lessons').insert(payload)
    }

    setShowModal(false)
    await loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Annullare questa lezione?')) return
    await supabase.from('lessons').update({ cancelled_at: new Date().toISOString() }).eq('id', id)
    await loadData()
  }

  // ── WEEK VIEW ────────────────────────────────────────────
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  function lessonsForSlot(day: Date, hour: number): Lesson[] {
    return lessons.filter(l => {
      const d = new Date(l.starts_at)
      return d.getDate() === day.getDate() &&
             d.getMonth() === day.getMonth() &&
             d.getFullYear() === day.getFullYear() &&
             d.getHours() === hour
    })
  }

  // ── MONTH VIEW ───────────────────────────────────────────
  function getDaysInMonth(date: Date) {
    const year  = date.getFullYear()
    const month = date.getMonth()
    const first = new Date(year, month, 1).getDay()
    const days  = new Date(year, month + 1, 0).getDate()
    const offset = first === 0 ? 6 : first - 1
    return { days, offset }
  }

  function lessonsForDay(day: number): Lesson[] {
    return lessons.filter(l => {
      const d = new Date(l.starts_at)
      return d.getDate() === day &&
             d.getMonth() === monthDate.getMonth() &&
             d.getFullYear() === monthDate.getFullYear()
    })
  }

  const levelLabel: Record<string,string> = {
    beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', fontFamily: 'system-ui', color: '#fff', height: '100%' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Navigazione */}
          <button onClick={() => {
            if (view === 'week') { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d) }
            else { const d = new Date(monthDate); d.setMonth(d.getMonth()-1); setMonthDate(d) }
          }} style={{ background: '#1e2535', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>‹</button>

          <div style={{ fontSize: '16px', fontWeight: '700', minWidth: '160px', textAlign: 'center' }}>
            {view === 'week'
              ? `${weekDays[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : monthDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
            }
          </div>

          <button onClick={() => {
            if (view === 'week') { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d) }
            else { const d = new Date(monthDate); d.setMonth(d.getMonth()+1); setMonthDate(d) }
          }} style={{ background: '#1e2535', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>›</button>

          <button onClick={() => {
            setWeekStart(getMonday(new Date()))
            setMonthDate(new Date())
          }} style={{ background: '#1e2535', border: 'none', color: '#8b93a8', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
            Oggi
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Toggle vista */}
          <div style={{ display: 'flex', background: '#1e2535', borderRadius: '8px', padding: '3px' }}>
            {(['week','month'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: view === v ? '#fff' : 'transparent', color: view === v ? '#0e1117' : '#8b93a8', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                {v === 'week' ? 'Settimana' : 'Mese'}
              </button>
            ))}
          </div>

          <button onClick={() => openNew(new Date().toISOString().split('T')[0], '10:00')}
            style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Nuova
          </button>
        </div>
      </div>

      {/* Legenda centri */}
      {clubs.length > 1 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {clubs.map(club => (
            <div key={club.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#8b93a8' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: clubColors[club.id] }} />
              {club.name}
            </div>
          ))}
        </div>
      )}

      {/* ── VISTA SETTIMANALE ── */}
      {view === 'week' && (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `50px repeat(7, 1fr)`, minWidth: isMobile ? '600px' : 'auto' }}>
            {/* Header giorni */}
            <div style={{ background: '#1e2535', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString()
              return (
                <div key={i} style={{ background: '#1e2535', padding: '10px 6px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '11px', color: '#5a5a6a', fontWeight: '700', textTransform: 'uppercase' }}>{DAYS[i]}</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: isToday ? '#c8f53a' : '#fff', lineHeight: '1.2', marginTop: '2px' }}>{day.getDate()}</div>
                </div>
              )
            })}

            {/* Righe ore */}
            {HOURS.map(hour => (
              <>
                <div key={`h-${hour}`} style={{ padding: '0 6px', height: '60px', display: 'flex', alignItems: 'flex-start', paddingTop: '4px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '11px', color: '#5a5a6a' }}>{hour}:00</span>
                </div>
                {weekDays.map((day, di) => {
                  const slotLessons = lessonsForSlot(day, hour)
                  const dateStr = day.toISOString().split('T')[0]
                  const timeStr = `${String(hour).padStart(2,'0')}:00`
                  return (
                    <div key={`${hour}-${di}`}
                      onClick={() => slotLessons.length === 0 && openNew(dateStr, timeStr)}
                      style={{ borderLeft: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.03)', height: '60px', padding: '2px', cursor: slotLessons.length === 0 ? 'pointer' : 'default', position: 'relative' }}
                    >
                      {slotLessons.length === 0 && (
                        <div style={{ position: 'absolute', inset: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                        >
                          <div style={{ fontSize: '18px', color: 'rgba(200,245,58,0.3)' }}>+</div>
                        </div>
                      )}
                      {slotLessons.map(lesson => (
                        <div key={lesson.id}
                          onClick={e => { e.stopPropagation(); openEdit(lesson) }}
                          style={{ background: `${clubColors[lesson.club_id]}18`, borderLeft: `3px solid ${clubColors[lesson.club_id]}`, borderRadius: '4px', padding: '3px 5px', cursor: 'pointer', marginBottom: '2px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: clubColors[lesson.club_id], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</div>
                          <div style={{ fontSize: '10px', color: '#8b93a8' }}>{new Date(lesson.starts_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* ── VISTA MENSILE ── */}
      {view === 'month' && (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
          {/* Header giorni */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#1e2535' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#5a5a6a', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Giorni */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {(() => {
              const { days, offset } = getDaysInMonth(monthDate)
              const cells = []

              // Celle vuote
              for (let i = 0; i < offset; i++) {
                cells.push(<div key={`empty-${i}`} style={{ minHeight: '80px', borderBottom: '1px solid rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.03)' }} />)
              }

              // Giorni del mese
              for (let day = 1; day <= days; day++) {
                const dayLessons = lessonsForDay(day)
                const isToday = new Date().getDate() === day &&
                                new Date().getMonth() === monthDate.getMonth() &&
                                new Date().getFullYear() === monthDate.getFullYear()
                const dateStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`

                cells.push(
                  <div key={day}
                    onClick={() => openNew(dateStr, '10:00')}
                    style={{ minHeight: '80px', padding: '6px', borderBottom: '1px solid rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: isToday ? 'rgba(200,245,58,0.04)' : 'transparent' }}>
                    <div style={{ fontSize: '13px', fontWeight: isToday ? '800' : '400', color: isToday ? '#c8f53a' : '#fff', marginBottom: '4px' }}>{day}</div>
                    {dayLessons.slice(0,3).map(l => (
                      <div key={l.id}
                        onClick={e => { e.stopPropagation(); openEdit(l) }}
                        style={{ background: `${clubColors[l.club_id]}20`, borderLeft: `2px solid ${clubColors[l.club_id]}`, borderRadius: '3px', padding: '2px 4px', marginBottom: '2px', fontSize: '10px', color: clubColors[l.club_id], fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {new Date(l.starts_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} {l.title}
                      </div>
                    ))}
                    {dayLessons.length > 3 && (
                      <div style={{ fontSize: '10px', color: '#5a5a6a' }}>+{dayLessons.length - 3} altri</div>
                    )}
                  </div>
                )
              }
              return cells
            })()}
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }}>
          <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: isMobile ? '20px 20px 0 0' : '20px', padding: '24px', width: '100%', maxWidth: isMobile ? '100%' : '480px', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>
              {editingLesson ? 'Modifica lezione' : 'Nuova lezione'}
            </div>
            <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '20px' }}>
              {form.date && new Date(form.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>

            {/* Centro */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Centro *</label>
              <select value={form.club_id} onChange={e => setForm({ ...form, club_id: e.target.value })}
                style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}>
                {clubs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Nome */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Nome lezione *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Es: Gruppo Intermedio B"
                style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Data e ora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Data *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Orario *</label>
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                  style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Campo */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Campo *</label>
              <input value={form.court} onChange={e => setForm({ ...form, court: e.target.value })} placeholder="Es: Campo 1"
                style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Livello e posti */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Livello</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                  style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}>
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzato</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Posti max</label>
                <select value={form.max_spots} onChange={e => setForm({ ...form, max_spots: e.target.value })}
                  style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}>
                  {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} posti</option>)}
                </select>
              </div>
            </div>

            {/* Durata e ricorrenza */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Durata</label>
                <select value={form.duration_min} onChange={e => setForm({ ...form, duration_min: e.target.value })}
                  style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                  <option value="120">120 min</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Ricorrenza</label>
                <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })}
                  style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}>
                  <option value="none">Singola</option>
                  <option value="weekly">Settimanale</option>
                  <option value="biweekly">Bisettimanale</option>
                </select>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)', borderRadius: '8px', padding: '10px 12px', color: '#e85858', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              {editingLesson && (
                <button onClick={() => handleDelete(editingLesson.id)}
                  style={{ padding: '13px 16px', background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.2)', color: '#e85858', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
                  Annulla lezione
                </button>
              )}
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
                Chiudi
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: '13px', background: saving ? '#5a7a20' : '#c8f53a', border: 'none', color: '#0e1117', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Salvataggio...' : editingLesson ? 'Salva' : 'Crea lezione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0,0,0,0)
  return d
}