'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useClub, useTheme } from '../club-context'

interface Lesson {
  id: string
  title: string
  level: string
  court: string
  starts_at: string
  duration_min: number
  max_spots: number
  recurrence: string
  cancelled_at: string | null
  club_id: string
}

const LEVEL_COLORS = ['#c8f53a', '#5b7fff', '#38c97a', '#f5a623', '#e85858']

export default function LezioniPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isMobile, setIsMobile] = useState(false)
  const [form, setForm] = useState({
    title: '', level: 'intermediate', court: '',
    date: '', time: '', duration_min: '90',
    max_spots: '4', recurrence: 'none', club_id: ''
  })
  const { activeClub, clubs } = useClub()
  const { bg, surface, surface2, border, text, textSub, textMuted, pc, isDark } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768) }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (activeClub) loadLessons()
  }, [activeClub])

  async function loadLessons() {
    if (!activeClub) return
    setLoading(true)

    const clubIds = clubs.map(c => c.id)
    if (clubIds.length === 0) { setLoading(false); return }

    const { data } = await supabase
      .from('lessons')
      .select('*')
      .in('club_id', clubIds)
      .is('cancelled_at', null)
      .order('starts_at', { ascending: true })

    setLessons(data ?? [])
    setLoading(false)
  }

  function openNew(date: string, time: string) {
    setEditingLesson(null)
    setForm({
      title: '', level: 'intermediate', court: '',
      date, time, duration_min: '90',
      max_spots: '4', recurrence: 'none',
      club_id: activeClub?.id ?? ''
    })
    setError('')
    setShowModal(true)
  }

  function openEdit(lesson: Lesson) {
    const dt   = new Date(lesson.starts_at)
    const date = dt.toISOString().split('T')[0]
    const time = dt.toTimeString().slice(0, 5)
    setEditingLesson(lesson)
    setForm({
      title:        lesson.title,
      level:        lesson.level,
      court:        lesson.court,
      date,
      time,
      duration_min: String(lesson.duration_min),
      max_spots:    String(lesson.max_spots),
      recurrence:   lesson.recurrence,
      club_id:      lesson.club_id
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title || !form.court || !form.date || !form.time || !form.club_id) {
      setError('Compila tutti i campi obbligatori')
      return
    }
    setSaving(true)
    setError('')

    const starts_at = new Date(`${form.date}T${form.time}`).toISOString()
    const payload   = {
      title:        form.title,
      level:        form.level,
      court:        form.court,
      starts_at,
      duration_min: parseInt(form.duration_min),
      max_spots:    parseInt(form.max_spots),
      recurrence:   form.recurrence,
      club_id:      form.club_id,
    }

    if (editingLesson) {
      const { error: e } = await supabase.from('lessons').update(payload).eq('id', editingLesson.id)
      if (e) { setError('Errore: ' + e.message); setSaving(false); return }
    } else {
      if (form.recurrence === 'weekly') {
        const inserts = []
        for (let i = 0; i < 12; i++) {
          const d = new Date(`${form.date}T${form.time}`)
          d.setDate(d.getDate() + i * 7)
          inserts.push({ ...payload, starts_at: d.toISOString() })
        }
        const { error: e } = await supabase.from('lessons').insert(inserts)
        if (e) { setError('Errore: ' + e.message); setSaving(false); return }
      } else {
        const { error: e } = await supabase.from('lessons').insert(payload)
        if (e) { setError('Errore: ' + e.message); setSaving(false); return }
      }
    }

    setShowModal(false)
    await loadLessons()
    setSaving(false)
  }

  async function handleCancel(lesson: Lesson) {
    if (!confirm(`Annullare la lezione "${lesson.title}"?`)) return
    await supabase.from('lessons').update({ cancelled_at: new Date().toISOString() }).eq('id', lesson.id)
    await loadLessons()
  }

  // ── CALENDARIO ──────────────────────────────────────────────

  function getWeekDays(date: Date): Date[] {
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  function getMonthDays(date: Date): (Date | null)[] {
    const first    = new Date(date.getFullYear(), date.getMonth(), 1)
    const last     = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    const startDay = (first.getDay() + 6) % 7
    const days: (Date | null)[] = Array(startDay).fill(null)
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(date.getFullYear(), date.getMonth(), d))
    }
    return days
  }

  const weekDays  = getWeekDays(currentDate)
  const monthDays = getMonthDays(currentDate)
  const hours     = Array.from({ length: 14 }, (_, i) => i + 7)

  const clubColorMap: Record<string, string> = {}
  clubs.forEach((c, i) => { clubColorMap[c.id] = LEVEL_COLORS[i % LEVEL_COLORS.length] })

  const dayLabel    = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
  const monthLabel  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
  const levelLabel: Record<string, string> = { beginner: 'Princ.', intermediate: 'Interm.', advanced: 'Avanz.' }

  function lessonsForDay(date: Date): Lesson[] {
    const dateStr = date.toISOString().split('T')[0]
    return lessons.filter(l => l.starts_at.split('T')[0] === dateStr)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 12px', background: surface2,
    border: `1.5px solid ${border}`, borderRadius: '8px',
    color: text, fontSize: '14px', outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: '700', color: textMuted,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    display: 'block', marginBottom: '6px'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: pc, fontFamily: 'system-ui', background: bg }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', fontFamily: 'system-ui', color: text, background: bg, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setCurrentDate(d => { const n = new Date(d); viewMode === 'week' ? n.setDate(n.getDate() - 7) : n.setMonth(n.getMonth() - 1); return n })}
            style={{ background: surface2, border: `1px solid ${border}`, color: text, width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
          <div style={{ fontSize: '15px', fontWeight: '700', minWidth: '160px', textAlign: 'center' }}>
            {viewMode === 'week'
              ? `${weekDays[0].getDate()} — ${weekDays[6].getDate()} ${monthLabel[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
              : `${monthLabel[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
          </div>
          <button onClick={() => setCurrentDate(d => { const n = new Date(d); viewMode === 'week' ? n.setDate(n.getDate() + 7) : n.setMonth(n.getMonth() + 1); return n })}
            style={{ background: surface2, border: `1px solid ${border}`, color: text, width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>›</button>
          <button onClick={() => setCurrentDate(new Date())}
            style={{ background: surface2, border: `1px solid ${border}`, color: textSub, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
            Oggi
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', background: surface2, padding: '3px', borderRadius: '8px', gap: '2px' }}>
            {(['week', 'month'] as const).map(v => (
              <div key={v} onClick={() => setViewMode(v)}
                style={{ padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: viewMode === v ? '700' : '400', background: viewMode === v ? text : 'transparent', color: viewMode === v ? bg : textSub }}>
                {v === 'week' ? 'Sett.' : 'Mese'}
              </div>
            ))}
          </div>
          <button onClick={() => openNew(new Date().toISOString().split('T')[0], '10:00')}
            style={{ background: pc, border: 'none', color: '#0e1117', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Nuova
          </button>
        </div>
      </div>

      {/* VISTA SETTIMANA */}
      {viewMode === 'week' && !isMobile && (
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden' }}>
          {/* Header giorni */}
          <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: `1px solid ${border}` }}>
            <div style={{ padding: '10px', background: surface2 }} />
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString()
              return (
                <div key={i} style={{ padding: '10px 6px', textAlign: 'center', background: surface2, borderLeft: `1px solid ${border}` }}>
                  <div style={{ fontSize: '11px', color: textMuted, marginBottom: '3px' }}>{dayLabel[i]}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: isToday ? pc : text, background: isToday ? `${pc}18` : 'transparent', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Griglia ore */}
          <div style={{ overflowY: 'auto', maxHeight: '600px' }}>
            {hours.map(hour => (
              <div key={hour} style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: `1px solid ${border}`, minHeight: '60px' }}>
                <div style={{ padding: '4px 8px', fontSize: '11px', color: textMuted, borderRight: `1px solid ${border}`, background: surface2, paddingTop: '6px' }}>
                  {hour}:00
                </div>
                {weekDays.map((day, di) => {
                  const dayLessons = lessonsForDay(day).filter(l => new Date(l.starts_at).getHours() === hour)
                  return (
                    <div key={di} onClick={() => openNew(day.toISOString().split('T')[0], `${String(hour).padStart(2,'0')}:00`)}
                      style={{ borderLeft: `1px solid ${border}`, padding: '2px', cursor: 'pointer', minHeight: '60px', position: 'relative' }}>
                      {dayLessons.map(lesson => (
                        <div key={lesson.id}
                          onClick={e => { e.stopPropagation(); openEdit(lesson) }}
                          style={{ background: `${clubColorMap[lesson.club_id] ?? pc}20`, border: `1px solid ${clubColorMap[lesson.club_id] ?? pc}`, borderLeft: `3px solid ${clubColorMap[lesson.club_id] ?? pc}`, borderRadius: '4px', padding: '3px 6px', fontSize: '11px', marginBottom: '2px', cursor: 'pointer' }}>
                          <div style={{ fontWeight: '700', color: clubColorMap[lesson.club_id] ?? pc, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</div>
                          <div style={{ color: textSub }}>{new Date(lesson.starts_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · {lesson.court}</div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA SETTIMANA MOBILE */}
      {viewMode === 'week' && isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {weekDays.map((day, i) => {
            const dayLessons = lessonsForDay(day)
            const isToday    = day.toDateString() === new Date().toDateString()
            return (
              <div key={i} style={{ background: surface, border: `1px solid ${isToday ? pc : border}`, borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ background: isToday ? `${pc}15` : surface2, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: isToday ? pc : text }}>
                    {dayLabel[i]} {day.getDate()} {monthLabel[day.getMonth()].slice(0,3)}
                  </div>
                  <button onClick={() => openNew(day.toISOString().split('T')[0], '10:00')}
                    style={{ background: pc, border: 'none', color: '#0e1117', width: '24px', height: '24px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
                {dayLessons.length === 0 ? (
                  <div style={{ padding: '10px 14px', fontSize: '12px', color: textMuted }}>Nessuna lezione</div>
                ) : (
                  dayLessons.map(lesson => (
                    <div key={lesson.id} onClick={() => openEdit(lesson)}
                      style={{ padding: '10px 14px', borderTop: `1px solid ${border}`, cursor: 'pointer', borderLeft: `3px solid ${clubColorMap[lesson.club_id] ?? pc}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: clubColorMap[lesson.club_id] ?? pc }}>{lesson.title}</div>
                        <div style={{ fontSize: '11px', color: textMuted }}>{new Date(lesson.starts_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div style={{ fontSize: '12px', color: textSub, marginTop: '2px' }}>📍 {lesson.court} · {lesson.max_spots} posti</div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* VISTA MESE */}
      {viewMode === 'month' && (
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${border}` }}>
            {dayLabel.map(d => (
              <div key={d} style={{ padding: '10px 6px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: textMuted, background: surface2 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {monthDays.map((day, i) => {
              if (!day) return <div key={i} style={{ minHeight: '80px', borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }} />
              const dayLessons = lessonsForDay(day)
              const isToday    = day.toDateString() === new Date().toDateString()
              return (
                <div key={i} onClick={() => openNew(day.toISOString().split('T')[0], '10:00')}
                  style={{ minHeight: '80px', borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, padding: '6px', cursor: 'pointer', background: isToday ? `${pc}08` : 'transparent' }}>
                  <div style={{ fontSize: '13px', fontWeight: isToday ? '800' : '400', color: isToday ? pc : text, marginBottom: '4px', width: '22px', height: '22px', borderRadius: '50%', background: isToday ? `${pc}20` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {day.getDate()}
                  </div>
                  {dayLessons.slice(0, 2).map(lesson => (
                    <div key={lesson.id} onClick={e => { e.stopPropagation(); openEdit(lesson) }}
                      style={{ background: `${clubColorMap[lesson.club_id] ?? pc}20`, border: `1px solid ${clubColorMap[lesson.club_id] ?? pc}40`, borderRadius: '3px', padding: '2px 4px', fontSize: '10px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: clubColorMap[lesson.club_id] ?? pc, fontWeight: '600' }}>
                      {new Date(lesson.starts_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} {lesson.title}
                    </div>
                  ))}
                  {dayLessons.length > 2 && (
                    <div style={{ fontSize: '10px', color: textMuted }}>+{dayLessons.length - 2} altre</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: isMobile ? '20px 20px 0 0' : '20px', padding: '24px', width: '100%', maxWidth: isMobile ? '100%' : '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px', color: text }}>
              {editingLesson ? 'Modifica lezione' : 'Nuova lezione'}
            </div>
            <div style={{ fontSize: '13px', color: textMuted, marginBottom: '20px' }}>
              {editingLesson ? editingLesson.title : 'Compila i dettagli della lezione'}
            </div>

            {/* Nome */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Nome gruppo *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Es: Gruppo Intermedio B" style={inputStyle} />
            </div>

            {/* Centro */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Centro *</label>
              <select value={form.club_id} onChange={e => setForm({ ...form, club_id: e.target.value })} style={{ ...inputStyle, outline: 'none' }}>
                <option value="">Seleziona centro</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Data e ora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Data *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Orario *</label>
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={inputStyle} />
              </div>
            </div>

            {/* Campo e durata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Campo *</label>
                <input value={form.court} onChange={e => setForm({ ...form, court: e.target.value })}
                  placeholder="Es: Campo 1" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Durata (min)</label>
                <select value={form.duration_min} onChange={e => setForm({ ...form, duration_min: e.target.value })} style={{ ...inputStyle, outline: 'none' }}>
                  {[60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>

            {/* Livello e posti */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Livello</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} style={{ ...inputStyle, outline: 'none' }}>
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzato</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Posti max</label>
                <input type="number" min="1" max="20" value={form.max_spots}
                  onChange={e => setForm({ ...form, max_spots: e.target.value })} style={inputStyle} />
              </div>
            </div>

            {/* Ricorrenza */}
            {!editingLesson && (
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Ricorrenza</label>
                <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })} style={{ ...inputStyle, outline: 'none' }}>
                  <option value="none">Lezione singola</option>
                  <option value="weekly">Settimanale (12 settimane)</option>
                </select>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)', borderRadius: '8px', padding: '10px 12px', color: '#e85858', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowModal(false); setError('') }}
                style={{ flex: 1, padding: '13px', background: 'transparent', border: `1px solid ${border}`, color: textSub, borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
                Annulla
              </button>
              {editingLesson && (
                <button onClick={() => handleCancel(editingLesson)}
                  style={{ padding: '13px 16px', background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.2)', color: '#e85858', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
                  Annulla lezione
                </button>
              )}
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: '13px', background: saving ? '#5a7a20' : pc, border: 'none', color: '#0e1117', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Salvataggio...' : editingLesson ? 'Salva modifiche' : 'Crea lezione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}