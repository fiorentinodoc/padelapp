'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  level: string
  group_name: string | null
  status: string
  joined_at: string
}

export default function AlunniPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [club, setClub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    level: 'intermediate',
    group_name: ''
  })
  const router = useRouter()
  const supabase = createClient()

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

      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('club_id', (profile.clubs as any).id)
        .order('joined_at', { ascending: false })

      setStudents(data ?? [])
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!club) return
    if (!form.first_name || !form.last_name) {
      setError('Nome e cognome sono obbligatori')
      return
    }

    setSaving(true)
    setError('')

    const { error: studentError } = await supabase
      .from('students')
      .insert({
        club_id:    club.id,
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email || null,
        phone:      form.phone || null,
        level:      form.level,
        group_name: form.group_name || null,
        status:     'active'
      })

    if (studentError) {
      setError('Errore: ' + studentError.message)
      setSaving(false)
      return
    }

    setShowModal(false)
    setForm({ first_name: '', last_name: '', email: '', phone: '', level: 'intermediate', group_name: '' })
    await loadData()
    setSaving(false)
  }

  async function toggleStatus(student: Student) {
    const newStatus = student.status === 'active' ? 'paused' : 'active'
    await supabase.from('students').update({ status: newStatus }).eq('id', student.id)
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

  const filtered = filter === 'all' ? students : students.filter(s => s.status === filter)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui', color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800' }}>Alunni</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>{students.filter(s => s.status === 'active').length} attivi · {students.length} totali</div>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
          + Aggiungi alunno
        </button>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: '4px', background: '#1e2535', padding: '4px', borderRadius: '10px', width: 'fit-content', marginBottom: '20px' }}>
        {[
          { value: 'all',    label: 'Tutti' },
          { value: 'active', label: 'Attivi' },
          { value: 'paused', label: 'In pausa' },
        ].map(f => (
          <div key={f.value} onClick={() => setFilter(f.value)} style={{ padding: '6px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: filter === f.value ? '600' : '400', background: filter === f.value ? '#fff' : 'transparent', color: filter === f.value ? '#0e1117' : '#8b93a8', transition: 'all 0.15s' }}>
            {f.label}
          </div>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>👥</div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Nessun alunno ancora</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '24px' }}>Aggiungi il primo alunno del club</div>
          <button onClick={() => setShowModal(true)} style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>+ Aggiungi alunno</button>
        </div>
      ) : (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e2535' }}>
                {['Alunno', 'Livello', 'Gruppo', 'Contatti', 'Stato', 'Azioni'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(student => (
                <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{student.first_name} {student.last_name}</div>
                    <div style={{ fontSize: '11px', color: '#5a5a6a', marginTop: '2px' }}>
                      {new Date(student.joined_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: `${levelColor[student.level]}18`, color: levelColor[student.level], border: `1px solid ${levelColor[student.level]}40`, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                      {levelLabel[student.level]}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#8b93a8' }}>{student.group_name ?? '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '12px', color: '#8b93a8' }}>{student.email ?? '—'}</div>
                    <div style={{ fontSize: '12px', color: '#5a5a6a', marginTop: '2px' }}>{student.phone ?? '—'}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: student.status === 'active' ? 'rgba(56,201,122,0.12)' : 'rgba(255,255,255,0.06)', color: student.status === 'active' ? '#38c97a' : '#8b93a8', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                      {student.status === 'active' ? 'Attivo' : 'In pausa'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => toggleStatus(student)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#8b93a8', padding: '5px 12px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>
                      {student.status === 'active' ? 'Pausa' : 'Riattiva'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '460px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Aggiungi alunno</div>
            <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '24px' }}>Inserisci i dati dell'alunno</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'Nome *', key: 'first_name', placeholder: 'Marco' },
                { label: 'Cognome *', key: 'last_name', placeholder: 'Ferretti' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                    style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            {[
              { label: 'Email', key: 'email', placeholder: 'marco@email.it', type: 'email' },
              { label: 'Telefono', key: 'phone', placeholder: '+39 333 1234567', type: 'tel' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                  style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Livello</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}>
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzato</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Gruppo</label>
                <input value={form.group_name} onChange={e => setForm({ ...form, group_name: e.target.value })} placeholder="Es: Gruppo B"
                  style={{ width: '100%', padding: '10px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)', borderRadius: '8px', padding: '10px 12px', color: '#e85858', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowModal(false); setError('') }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>Annulla</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#5a7a20' : '#c8f53a', border: 'none', color: '#0e1117', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Salvataggio...' : 'Aggiungi alunno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}