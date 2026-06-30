'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useClub, useTheme } from '../club-context'

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
  profile_id: string | null
  club_ids?: string[]
}

interface ClubLocal {
  id: string
  name: string
}

export default function AlunniPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [clubs, setClubs] = useState<ClubLocal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [clubFilter, setClubFilter] = useState('all')
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', level: 'intermediate', group_name: '',
    club_ids: [] as string[]
  })
  const { activeClub } = useClub()
  const { bg, surface, surface2, border, text, textSub, textMuted, pc } = useTheme()
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

    const { data: ic } = await supabase
      .from('instructor_clubs')
      .select('clubs(id, name)')
      .eq('profile_id', user.id)

    const clubList: ClubLocal[] = ic?.map((c: any) => c.clubs).filter(Boolean) ?? []
    setClubs(clubList)

    const clubIds = clubList.map(c => c.id)
    if (clubIds.length === 0) { setStudents([]); setLoading(false); return }

    const { data: scLinks } = await supabase
      .from('student_clubs')
      .select('student_id, club_id')
      .in('club_id', clubIds)

    const studentIds = [...new Set((scLinks ?? []).map((s: any) => s.student_id))]
    if (studentIds.length === 0) { setStudents([]); setLoading(false); return }

    const { data } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds)
      .order('joined_at', { ascending: false })

    const enriched: Student[] = (data ?? []).map((s: any) => ({
      ...s,
      club_ids: (scLinks ?? []).filter((l: any) => l.student_id === s.id).map((l: any) => l.club_id)
    }))

    setStudents(enriched)
    setLoading(false)
  }

  function openNew() {
    setEditingStudent(null)
    setForm({
      first_name: '', last_name: '', email: '', phone: '', level: 'intermediate', group_name: '',
      club_ids: activeClub ? [activeClub.id] : []
    })
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
      group_name: student.group_name ?? '',
      club_ids:   student.club_ids ?? []
    })
    setError('')
    setShowModal(true)
  }

  function toggleClubSelection(clubId: string) {
    setForm(f => ({
      ...f,
      club_ids: f.club_ids.includes(clubId)
        ? f.club_ids.filter(id => id !== clubId)
        : [...f.club_ids, clubId]
    }))
  }

  async function handleSave() {
    if (!form.first_name || !form.last_name) {
      setError('Nome e cognome sono obbligatori')
      return
    }
    if (!form.email) {
      setError('L\'email è obbligatoria per permettere all\'alunno di accedere all\'app')
      return
    }
    if (form.club_ids.length === 0) {
      setError('Seleziona almeno un centro')
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
          email:      form.email,
          phone:      form.phone || null,
          level:      form.level,
          group_name: form.group_name || null,
        })
        .eq('id', editingStudent.id)

      if (updateError) { setError('Errore: ' + updateError.message); setSaving(false); return }

      const currentIds = editingStudent.club_ids ?? []
      const toRemove = currentIds.filter(id => !form.club_ids.includes(id))
      const toAdd    = form.club_ids.filter(id => !currentIds.includes(id))

      if (toRemove.length > 0) {
        await supabase.from('student_clubs')
          .delete()
          .eq('student_id', editingStudent.id)
          .in('club_id', toRemove)
      }
      if (toAdd.length > 0) {
        await supabase.from('student_clubs').insert(
          toAdd.map(clubId => ({ student_id: editingStudent.id, club_id: clubId }))
        )
      }
    } else {
      // Controlla che l'email non sia già usata da un altro alunno
      const { data: existingByEmail } = await supabase
        .from('students')
        .select('id')
        .eq('email', form.email)
        .maybeSingle()

      if (existingByEmail) {
        setError('Esiste già un alunno con questa email')
        setSaving(false)
        return
      }

      const { data: clubData } = await supabase
        .from('clubs')
        .select('plan')
        .eq('id', form.club_ids[0])
        .single()

      const planLimits: Record<string, number> = { free: 20, starter: 100, pro: 99999 }
      const maxStudents = planLimits[clubData?.plan ?? 'free']

      if (students.length >= maxStudents) {
        setError(
          clubData?.plan === 'free'
            ? '⚠️ Piano Free: limite di 20 alunni raggiunto. Passa a Starter per fino a 100 alunni.'
            : '⚠️ Piano Starter: limite di 100 alunni raggiunto. Passa a Pro per alunni illimitati.'
        )
        setSaving(false)
        return
      }

      const { data: newStudent, error: studentError } = await supabase
        .from('students')
        .insert({
          club_id:    form.club_ids[0],
          first_name: form.first_name,
          last_name:  form.last_name,
          email:      form.email,
          phone:      form.phone || null,
          level:      form.level,
          group_name: form.group_name || null,
          status:     'active'
        })
        .select()
        .single()

      if (studentError) { setError('Errore: ' + studentError.message); setSaving(false); return }

      if (newStudent) {
        await supabase.from('student_clubs').insert(
          form.club_ids.map(clubId => ({ student_id: newStudent.id, club_id: clubId }))
        )
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
  async function handleDeleteStudent(student: Student) {
  if (!confirm(`Eliminare definitivamente ${student.first_name} ${student.last_name}?\n\nVerranno rimosse anche tutte le sue prenotazioni.`)) return
  await supabase.from('bookings').delete().eq('student_id', student.id)
  await supabase.from('student_clubs').delete().eq('student_id', student.id)
  await supabase.from('students').delete().eq('id', student.id)
  await loadData()
}

  function sendInvite(student: Student) {
  if (!student.email) {
    alert('Questo alunno non ha un\'email salvata')
    return
  }
  const link = 'https://padelapp-zeta.vercel.app/login'
  const msg  = `Ciao ${student.first_name}! Ti aspettiamo su Remate 🎾\n\nRegistrati qui: ${link}\n\nUsa questa email (${student.email}) per registrarti — verrai collegato automaticamente.`

  if (student.phone) {
    const cleaned = student.phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`, '_blank')
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }
}

  const levelLabel: Record<string, string> = {
    beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato'
  }
  const levelColor: Record<string, string> = {
    beginner: '#f5a623', intermediate: '#5b7fff', advanced: '#38c97a'
  }

  const clubNameMap: Record<string, string> = {}
  clubs.forEach(c => { clubNameMap[c.id] = c.name })

  const filtered = students.filter(s => {
    const matchStatus = filter === 'all' || s.status === filter
    const matchClub   = clubFilter === 'all' || (s.club_ids ?? []).includes(clubFilter)
    return matchStatus && matchClub
  })

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
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: text, background: bg, minHeight: '100vh' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800' }}>Alunni</div>
          <div style={{ fontSize: '13px', color: textMuted, marginTop: '4px' }}>
            {students.filter(s => s.status === 'active').length} attivi · {students.length} totali
          </div>
        </div>
        <button onClick={openNew} style={{ background: pc, border: 'none', color: '#0e1117', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Aggiungi
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px', background: surface2, padding: '4px', borderRadius: '10px', width: 'fit-content', marginBottom: '14px' }}>
        {[
          { value: 'all',    label: 'Tutti' },
          { value: 'active', label: 'Attivi' },
          { value: 'paused', label: 'In pausa' },
        ].map(f => (
          <div key={f.value} onClick={() => setFilter(f.value)}
            style={{ padding: '6px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: filter === f.value ? '600' : '400', background: filter === f.value ? text : 'transparent', color: filter === f.value ? bg : textSub }}>
            {f.label}
          </div>
        ))}
      </div>

      {clubs.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div onClick={() => setClubFilter('all')}
            style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', border: `1px solid ${clubFilter === 'all' ? pc : border}`, cursor: 'pointer', background: clubFilter === 'all' ? `${pc}18` : surface2, color: clubFilter === 'all' ? pc : textSub, fontWeight: clubFilter === 'all' ? '700' : '400' }}>
            🏟️ Tutti i centri
          </div>
          {clubs.map(club => (
            <div key={club.id} onClick={() => setClubFilter(club.id)}
              style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', border: `1px solid ${clubFilter === club.id ? pc : border}`, cursor: 'pointer', background: clubFilter === club.id ? `${pc}18` : surface2, color: clubFilter === club.id ? pc : textSub, fontWeight: clubFilter === club.id ? '700' : '400' }}>
              {club.name}
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>👥</div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Nessun alunno ancora</div>
          <div style={{ fontSize: '13px', color: textMuted, marginBottom: '24px' }}>Aggiungi il primo alunno o manda un link invito</div>
          <button onClick={openNew} style={{ background: pc, border: 'none', color: '#0e1117', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            + Aggiungi alunno
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(student => (
            <div key={student.id} style={{ background: student.status === 'paused' ? (isMobile ? surface2 : `${surface2}80`) : surface, border: `1px solid ${student.status === 'paused' ? border : border}`, borderRadius: '14px', padding: '16px', opacity: student.status === 'paused' ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: text }}>{student.first_name} {student.last_name}</div>
                    {student.profile_id ? (
                      <span style={{ background: 'rgba(56,201,122,0.12)', color: '#38c97a', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700' }}>
                        ✓ App attiva
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(245,166,35,0.12)', color: '#f5a623', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700' }}>
                        Non registrato
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ background: `${levelColor[student.level]}18`, color: levelColor[student.level], border: `1px solid ${levelColor[student.level]}40`, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                      {levelLabel[student.level]}
                    </span>
                    {student.group_name && (
                      <span style={{ background: surface2, color: textSub, padding: '2px 10px', borderRadius: '20px', fontSize: '11px' }}>
                        {student.group_name}
                      </span>
                    )}
                    <span style={{ background: student.status === 'active' ? 'rgba(56,201,122,0.12)' : surface2, color: student.status === 'active' ? '#38c97a' : textSub, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                      {student.status === 'active' ? 'Attivo' : 'In pausa'}
                    </span>
                  </div>

                  {clubs.length > 1 && (student.club_ids?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {student.club_ids!.map(cid => (
                        <span key={cid} style={{ background: 'rgba(91,127,255,0.1)', color: '#5b7fff', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '600' }}>
                          🏟️ {clubNameMap[cid] ?? '...'}
                        </span>
                      ))}
                    </div>
                  )}

                  {(student.email || student.phone) && (
                    <div style={{ fontSize: '12px', color: textMuted }}>
                      {student.email && <div>{student.email}</div>}
                      {student.phone && <div>{student.phone}</div>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '6px', flexShrink: 0 }}>
                  {!student.profile_id && (
                    <button onClick={() => sendInvite(student)}
                      style={{ background: '#25D366', border: 'none', color: '#fff', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      📱 Manda invito
                    </button>
                  )}
                  <button onClick={() => openEdit(student)}
                    style={{ background: 'rgba(91,127,255,0.1)', border: '1px solid rgba(91,127,255,0.2)', color: '#5b7fff', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    ✏️ Modifica
                  </button>
                 <button onClick={() => toggleStatus(student)}
  style={{ background: student.status === 'active' ? 'rgba(245,166,35,0.1)' : 'rgba(56,201,122,0.1)', border: `1px solid ${student.status === 'active' ? 'rgba(245,166,35,0.2)' : 'rgba(56,201,122,0.2)'}`, color: student.status === 'active' ? '#f5a623' : '#38c97a', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600' }}>
  {student.status === 'active' ? '⏸ Pausa' : '▶ Riattiva'}
</button>
<button onClick={() => handleDeleteStudent(student)}
  style={{ background: 'rgba(232,88,88,0.08)', border: '1px solid rgba(232,88,88,0.15)', color: '#e85858', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
  🗑️ Elimina
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
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: isMobile ? '20px 20px 0 0' : '20px', padding: '24px', width: '100%', maxWidth: isMobile ? '100%' : '460px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px', color: text }}>
              {editingStudent ? 'Modifica alunno' : 'Aggiungi alunno'}
            </div>
            <div style={{ fontSize: '13px', color: textMuted, marginBottom: '20px' }}>
              {editingStudent ? `${editingStudent.first_name} ${editingStudent.last_name}` : 'Inserisci i dati del nuovo alunno'}
            </div>

            {clubs.length > 1 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Centro/i *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {clubs.map(club => {
                    const checked = form.club_ids.includes(club.id)
                    return (
                      <div key={club.id} onClick={() => toggleClubSelection(club.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', background: checked ? `${pc}12` : surface2, border: `1.5px solid ${checked ? pc : border}`, borderRadius: '8px', padding: '10px 12px', cursor: 'pointer' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${checked ? pc : textMuted}`, background: checked ? pc : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {checked && <span style={{ color: '#0e1117', fontSize: '12px', fontWeight: '900' }}>✓</span>}
                        </div>
                        <span style={{ fontSize: '13px', color: text, fontWeight: checked ? '600' : '400' }}>{club.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'Nome *', key: 'first_name', placeholder: 'Marco' },
                { label: 'Cognome *', key: 'last_name', placeholder: 'Ferretti' },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder} style={inputStyle} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Email * <span style={{ color: textMuted, fontWeight: '400', textTransform: 'none' }}>(serve per l'accesso all'app)</span></label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="marco@email.it" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Telefono</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+39 333 1234567" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Livello</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                  style={{ ...inputStyle, outline: 'none' }}>
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzato</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Gruppo</label>
                <input value={form.group_name} onChange={e => setForm({ ...form, group_name: e.target.value })}
                  placeholder="Es: Gruppo B" style={inputStyle} />
              </div>
            </div>

            {!editingStudent && (
              <div style={{ background: 'rgba(91,127,255,0.08)', border: '1px solid rgba(91,127,255,0.15)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: textSub, marginBottom: '16px', lineHeight: '1.5' }}>
                💡 Dopo averlo aggiunto potrai mandargli l'invito via WhatsApp con il bottone "📱 Manda invito" — si registrerà con questa email e verrà collegato automaticamente.
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
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: '13px', background: saving ? '#5a7a20' : pc, border: 'none', color: '#0e1117', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Salvataggio...' : editingStudent ? 'Salva modifiche' : 'Aggiungi alunno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}