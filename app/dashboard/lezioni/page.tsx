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

interface Club {
  id: string
  name: string
}

export default function LezioniPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    level: 'intermediate',
    court: '',
    date: '',
    time: '',
    duration_min: '90',
    max_spots: '4',
    recurrence: 'weekly'
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Carica il club dell'utente
    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id, clubs(id, name)')
      .eq('id', user.id)
      .single()

    if (profile?.clubs) {
      setClub(profile.clubs as any)

      // Carica le lezioni del club
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

  async function handleSave() {
    if (!club) return
    if (!form.title || !form.court || !form.date || !form.time) {
      setError('Compila tutti i campi obbligatori')
      return
    }

    setSaving(true)
    setError('')

    const starts_at = new Date(`${form.date}T${form.time}:00`).toISOString()

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

    setShowModal(false)
    setForm({ title: '', level: 'intermediate', court: '', date: '', time: '', duration_min: '90', max_spots: '4', recurrence: 'weekly' })
    await loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Annullare questa lezione?')) return
    await supabase
      .from('lessons')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', id)
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
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', fontFamily: 'system-ui', color: '#fff' }}>

      {/* Topbar */}
      <div style={{ background: '#161b27', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#c8f53a', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>padel●</div>
          <div style={{ fontSize: '13px', color: '#8b93a8' }}>{club?.name}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>← Dashboard</button>
          <button onClick={() => setShowModal(true)} style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>+ Nuova lezione</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '22px', fontWeight: '800' }}>Lezioni</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>{lessons.length} lezioni programmate</div>
        </div>

        {lessons.length === 0 ? (
          <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎾</div>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Nessuna lezione ancora</div>
            <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '24px' }}>Crea la prima lezione per iniziare</div>
            <button onClick={() => setShowModal(true)} style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>+ Crea prima lezione</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {lessons.map(lesson => {
              const date = new Date(lesson.starts_at)
              const dateStr = date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
              const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

              return (
                <div key={lesson.id} style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {/* Data */}
                  <div style={{ background: '#1e2535', borderRadius: '10px', padding: '10px 14px', textAlign: 'center', minWidth: '70px' }}>
                    <div style={{ fontSize: '11px', color: '#5a5a6a', textTransform: 'uppercase', fontWeight: '700' }}>{date.toLocaleDateString('it-IT', { weekday: 'short' })}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', lineHeight: '1.1' }}>{date.getDate()}</div>
                    <div style={{ fontSize: '11px', color: '#5a5a6a' }}>{date.toLocaleDateString('it-IT', { month: 'short' })}</div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{lesson.title}</div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#8b93a8', flexWrap: 'wrap' }}>
                      <span>🕐 {timeStr} · {lesson.duration_min} min</span>
                      <span>📍 {lesson.court}</span>
                      <span>👥 max {lesson.max_spots}</span>
                      {lesson.recurrence && <span>🔁 {recurrenceLabel[lesson.recurrence] ?? lesson.recurrence}</span>}
                    </div>
                  </div>

                  {/* Level badge */}
                  <div style={{ background: `${levelColor[lesson.level]}18`, color: levelColor[lesson.level], border: `1px solid ${levelColor[lesson.level]}40`, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                    {levelLabel[lesson.level]}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(lesson.id)}
                    style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.2)', color: '#e85858', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Annulla
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL nuova lezione */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Nuova lezione</div>
            <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '24px' }}>Compila i dettagli della lezione</div>

            {/* Nome */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Nome lezione *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Es: Gruppo Intermedio B" style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Data e ora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Data *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Orario *</label>
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Campo */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Campo *</label>
              <input value={form.court} onChange={e => setForm({ ...form, court: e.target.value })} placeholder="Es: Campo 1" style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Livello e posti */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Livello</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}>
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzato</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Posti max</label>
                <select value={form.max_spots} onChange={e => setForm({ ...form, max_spots: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}>
                  {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} posti</option>)}
                </select>
              </div>
            </div>

            {/* Durata e ricorrenza */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Durata</label>
                <select value={form.duration_min} onChange={e => setForm({ ...form, duration_min: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                  <option value="120">120 min</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Ricorrenza</label>
                <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}>
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
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>Annulla</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#5a7a20' : '#c8f53a', border: 'none', color: '#0e1117', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Salvataggio...' : 'Crea lezione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}