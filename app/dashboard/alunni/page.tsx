'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useClub } from '../club-context'

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
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', level: 'intermediate', group_name: ''
  })
  const { activeClub } = useClub()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768) }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (activeClub) loadData()
  }, [activeClub])

  async function loadData() {
    if (!activeClub) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Usa student_clubs per filtrare correttamente per club
    const { data: studentClubIds } = await supabase
      .from('student_clubs')
      .select('student_id')
      .eq('club_id', activeClub.id)

    const ids = studentClubIds?.map((s: any) => s.student_id) ?? []

    if (ids.length === 0) {
      setStudents([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('students')
      .select('*')
      .in('id', ids)
      .order('joined_at', { ascending: false })

    setStudents(data ?? [])
    setLoading(false)
  }

  function openNew() {
    setEditingStudent(null)
    setForm({ first_name: '', last_name: '', email: '', phone: '', level: 'intermediate', group_name: '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(student: Student) {
    setEditingStudent(student)
    setForm({
      first_name: student.first_name,
      last_name:  student.last_name,
      email:      student.email ?? '',
      phone:      student.phone ?? '',
      level:      student.level,
      group_name: student.group_name ?? ''
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!activeClub) return
    if (!form.first_name || !form.last_name) 
      // Controlla limite alunni solo per nuovi inserimenti
if (!editingStudent && activeClub) {
  const { data: clubData } = await supabase
    .from('clubs')
    .select('plan, max_students')
    .eq('id', activeClub.id)
    .single()

  const planLimits: Record<string, number> = {
    free:    20,
    starter: 100,
    pro:     99999
  }

  const maxStudents = planLimits[clubData?.plan ?? 'free']
  const currentCount = students.length

  if (currentCount >= maxStudents) {
    setError(
      clubData?.plan === 'free'
        ? '⚠️ Piano Free: limite di 20 alunni raggiunto. Passa a Starter per fino a 100 alunni.'
        : clubData?.plan === 'starter'
        ? '⚠️ Piano Starter: limite di 100 alunni raggiunto. Passa a Pro per alunni illimitati.'
        : 'Limite alunni raggiunto.'
    )
    setSaving(false)
    return
  }
}
      setError('Nome e cognome sono obbligatori')
      return
    }
    setSaving(true)
    setError('')

    if (editingStudent) {
      const { error: updateError } = await supabase
        .from('students')
        .update({
          first_name: form.first_name,
          last_name:  form.last_name,
          email:      form.email || null,
          phone:      form.phone || null,
          level:      form.level,
          group_name: form.group_name || null,
        })
        .eq('id', editingStudent.id)

      if (updateError) {
        setError('Errore: ' + updateError.message)
        setSaving(false)
        return
      }
    } else {
      // Inserisci nuovo student
      const { data: newStudent, error: studentError } = await supabase
        .from('students')
        .insert({
          club_id:    activeClub.id,
          first_name: form.first_name,
          last_name:  form.last_name,
          email:      form.email || null,
          phone:      form.phone || null,
          level:      form.level,
          group_name: form.group_name || null,
          status:     'active'
        })
        .select()
        .single()

      if (studentError) {
        setError('Errore: ' + studentError.message)
        setSaving(false)
        return
      }

      // Collega a student_clubs
      if (newStudent) {
        await supabase.from('student_clubs').insert({
          student_id: newStudent.id,
          club_id:    activeClub.id
        })
      }
    }

    setShowModal(false)
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
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: '#fff' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800' }}>Alunni</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>
            {students.filter(s => s.status === 'active').length} attivi · {students.length} totali
          </div>
        </div>
        <button onClick={openNew} style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Aggiungi
        </button>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: '4px', background: '#1e2535', padding: '4px', borderRadius: '10px', width: 'fit-content', marginBottom: '20px' }}>
        {[
          { value: 'all',    label: 'Tutti' },
          { value: 'active', label: 'Attivi' },
          { value: 'paused', label: 'In pausa' },
        ].map(f => (
          <div key={f.value} onClick={() => setFilter(f.value)}
            style={{ padding: '6px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: filter === f.value ? '600' : '400', background: filter === f.value ? '#fff' : 'transparent', color: filter === f.value ? '#0e1117' : '#8b93a8', transition: 'all 0.15s' }}>
            {f.label}
          </div>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>👥</div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Nessun alunno ancora</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '24px' }}>Aggiungi il primo alunno o manda un link invito</div>
          <button onClick={openNew} style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            + Aggiungi alunno
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(student => (
            <div key={student.id} style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{student.first_name} {student.last_name}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ background: `${levelColor[student.level]}18`, color: levelColor[student.level], border: `1px solid ${levelColor[student.level]}40`, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                      {levelLabel[student.level]}
                    </span>
                    {student.group_name && (
                      <span style={{ background: 'rgba(255,255,255,0.06)', color: '#8b93a8', padding: '2px 10px', borderRadius: '20px', fontSize: '11px' }}>
                        {student.group_name}
                      </span>
                    )}
                    <span style={{ background: student.status === 'active' ? 'rgba(56,201,122,0.12)' : 'rgba(255,255,255,0.06)', color: student.status === 'active' ? '#38c97a' : '#8b93a8', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                      {student.status === 'active' ? 'Attivo' : 'In pausa'}
                    </span>
                  </div>
                  {(student.email || student.phone) && (
                    <div style={{ fontSize: '12px', color: '#5a5a6a' }}>
                      {student.email && <div>{student.email}</div>}
                      {student.phone && <div>{student.phone}</div>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => openEdit(student)}
                    style={{ background: 'rgba(91,127,255,0.1)', border: '1px solid rgba(91,127,255,0.2)', color: '#5b7fff', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    ✏️ Modifica
                  </button>
                  <button onClick={() => toggleStatus(student)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#8b93a8', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {student.status === 'active' ? 'Pausa' : 'Riattiva'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }}>
          <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: isMobile ? '20px 20px 0 0' : '20px', padding: '24px', width: '100%', maxWidth: isMobile ? '100%' : '460px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>
              {editingStudent ? 'Modifica alunno' : 'Aggiungi alunno'}
            </div>
            <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '20px' }}>
              {editingStudent ? `${editingStudent.first_name} ${editingStudent.last_name}` : 'Inserisci i dati del nuovo alunno'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'Nome *', key: 'first_name', placeholder: 'Marco' },
                { label: 'Cognome *', key: 'last_name', placeholder: 'Ferretti' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                    style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
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
                  style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
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
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Gruppo</label>
                <input value={form.group_name} onChange={e => setForm({ ...form, group_name: e.target.value })} placeholder="Es: Gruppo B"
                  style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)', borderRadius: '8px', padding: '10px 12px', color: '#e85858', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowModal(false); setError('') }}
                style={{ flex: 1, padding: '13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
                Annulla
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: '13px', background: saving ? '#5a7a20' : '#c8f53a', border: 'none', color: '#0e1117', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Salvataggio...' : editingStudent ? 'Salva modifiche' : 'Aggiungi alunno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}