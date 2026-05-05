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
  recurrence: string | null
}

export default function LezioniPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [club, setClub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [form, setForm] = useState({
    title: '', level: 'intermediate', court: '',
    date: '', time: '', duration_min: '90',
    max_spots: '4', recurrence: 'weekly'
  })
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
      .select('club_id, clubs(id, name)')
      .eq('id', user.id)
      .single()

    if (profile?.clubs) {
      setClub(profile.clubs as any)
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('club_id', (profile.clubs as any).id)
        .is('cancelled_at', null)
        .order('starts_at', { ascending: true })
      setLessons(lessonsData ?? [])
    }
    setLoading(false)
  }

  function openNew() {
    setEditingLesson(null)
    setForm({ title: '', level: 'intermediate', court: '', date: '', time: '', duration_min: '90', max_spots: '4', recurrence: 'weekly' })
    setError('')
    setShowModal(true)
  }

  function openEdit(lesson: Lesson) {
    setEditingLesson(lesson)
    const date = new Date(lesson.starts_at)
    const dateStr = date.toISOString().split('T')[0]
    const timeStr = date.toTimeString().slice(0, 5)
    setForm({
      title:        lesson.title,
      level:        lesson.level,
      court:        lesson.court,
      date:         dateStr,
      time:         timeStr,
      duration_min: String(lesson.duration_min),
      max_spots:    String(lesson.max_spots),
      recurrence:   lesson.recurrence ?? 'none'
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!club) return
    if (!form.title || !form.court || !form.date || !form.time) {
      setError('Compila tutti i campi obbligatori')
      return
    }
    setSaving(true)
    setError('')

    const starts_at = new Date(`${form.date}T${form.time}:00`).toISOString()

    if (editingLesson) {
      const { error: updateError } = await supabase
        .from('lessons')
        .update({
          title:        form.title,
          level:        form.level,
          court:        form.court,
          starts_at,
          duration_min: parseInt(form.duration_min),
          max_spots:    parseInt(form.max_spots),
          recurrence:   form.recurrence === 'none' ? null : form.recurrence
        })
        .eq('id', editingLesson.id)

      if (updateError) {
        setError('Errore: ' + updateError.message)
        setSaving(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('lessons')
        .insert({
          club_id:      club.id,
          title:        form.title,
          level:        form.level,
          court:        form.court,
          starts_at,
          duration_min: parseInt(form.duration_min),
          max_spots:    parseInt(form.max_spots),
          recurrence:   form.recurrence === 'none' ? null : form.recurrence
        })

      if (insertError) {
        setError('Errore: ' + insertError.message)
        setSaving(false)
        return
      }
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

  const levelLabel: Record<string, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzato'
  }
  const levelColor: Record<string, string> = {
    beginner: '#f5a623',
    intermediate: '#5b7fff',
    advanced: '#38c97a'
  }
  const recurrenceLabel: Record<string, string> = {
    weekly: 'Settimanale',
    biweekly: 'Bisettimanale',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800' }}>Lezioni</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>{lessons.length} lezioni programmate</div>
        </div>
        <button onClick={openNew} style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Nuova
        </button>
      </div>

      {/* Lista */}
      {lessons.length === 0 ? (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎾</div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Nessuna lezione ancora</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '24px' }}>Crea la prima lezione per iniziare</div>
          <button onClick={openNew} style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>+ Crea prima lezione</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {lessons.map(lesson => {
            const date = new Date(lesson.starts_at)
            const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={lesson.id} style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
                {/* Riga superiore */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ background: '#1e2535', borderRadius: '8px', padding: '8px 10px', textAlign: 'center', minWidth: '50px', flexShrink: 0 }}>
                      <div style={{ fontSize: '10px', color: '#5a5a6a', textTransform: 'uppercase', fontWeight: '700' }}>{date.toLocaleDateString('it-IT', { weekday: 'short' })}</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', lineHeight: '1.1' }}>{date.getDate()}</div>
                      <div style={{ fontSize: '10px', color: '#5a5a6a' }}>{date.toLocaleDateString('it-IT', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '3px' }}>{lesson.title}</div>
                      <div style={{ fontSize: '12px', color: '#8b93a8' }}>🕐 {timeStr} · {lesson.duration_min} min</div>
                    </div>
                  </div>
                  <span style={{ background: `${levelColor[lesson.level]}18`, color: levelColor[lesson.level], border: `1px solid ${levelColor[lesson.level]}40`, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {levelLabel[lesson.level]}
                  </span>
                </div>

                {/* Riga inferiore */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#8b93a8', flexWrap: 'wrap' }}>
                    <span>📍 {lesson.court}</span>
                    <span>👥 max {lesson.max_spots}</span>
                    {lesson.recurrence && <span>🔁 {recurrenceLabel[lesson.recurrence] ?? lesson.recurrence}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(lesson)}
                      style={{ background: 'rgba(91,127,255,0.1)', border: '1px solid rgba(91,127,255,0.2)', color: '#5b7fff', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      ✏️ Modifica
                    </button>
                    <button onClick={() => handleDelete(lesson.id)}
                      style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.2)', color: '#e85858', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
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
              {editingLesson ? editingLesson.title : 'Compila i dettagli della lezione'}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Nome lezione *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Es: Gruppo Intermedio B"
                style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

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

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Campo *</label>
              <input value={form.court} onChange={e => setForm({ ...form, court: e.target.value })} placeholder="Es: Campo 1"
                style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

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
              <div style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)', borderRadius: '8px', padding: '10px 12px', color: '#e85858', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
                Annulla
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: '13px', background: saving ? '#5a7a20' : '#c8f53a', border: 'none', color: '#0e1117', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Salvataggio...' : editingLesson ? 'Salva modifiche' : 'Crea lezione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}