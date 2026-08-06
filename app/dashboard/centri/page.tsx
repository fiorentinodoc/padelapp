'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useClub, useTheme } from '../club-context'

interface Club {
  id: string
  name: string
  plan: string
  whatsapp_number: string | null
}

interface Collaborator {
  id: string
  email: string
  club_id: string
  used: boolean
  created_at: string
}

export default function CentriPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [availableStudents, setAvailableStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCollabModal, setShowCollabModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingCollab, setSavingCollab] = useState(false)
  const [error, setError] = useState('')
  const [collabError, setCollabError] = useState('')
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [selectedClubForCollab, setSelectedClubForCollab] = useState<Club | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [form, setForm] = useState({ name: '', whatsapp_number: '' })
  const { activeClub, refreshClub } = useClub()
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
      .select('clubs(id, name, plan, whatsapp_number), role')
      .eq('profile_id', user.id)

    const clubList = ic?.map((c: any) => c.clubs).filter(Boolean) ?? []
    setClubs(clubList)

    const ownerRole = ic?.some((c: any) => c.role === 'owner')
    setIsOwner(!!ownerRole)

    const ownerClubIds = ic
      ?.filter((c: any) => c.role === 'owner')
      .map((c: any) => c.clubs?.id)
      .filter(Boolean) ?? []

    if (ownerClubIds.length > 0) {
      const { data: collabs } = await supabase
        .from('collaborator_invites')
        .select('*')
        .in('club_id', ownerClubIds)
        .order('created_at', { ascending: false })
      setCollaborators(collabs ?? [])
    }

    setLoading(false)
  }

  function openNew() {
    setEditingClub(null)
    setForm({ name: '', whatsapp_number: '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(club: Club) {
    setEditingClub(club)
    setForm({ name: club.name, whatsapp_number: club.whatsapp_number ?? '' })
    setError('')
    setShowModal(true)
  }

  async function openCollabModal(club: Club) {
    setSelectedClubForCollab(club)
    setSelectedStudentId('')
    setCollabError('')
    setAvailableStudents([])

    // Carica tutti gli alunni registrati (con profile_id) del club
    const { data: students } = await supabase
      .from('students')
      .select('id, first_name, last_name, email, profile_id')
      .eq('club_id', club.id)
      .not('profile_id', 'is', null)
      .eq('status', 'active')
      .order('first_name', { ascending: true })

    // Filtra chi è già collaboratore attivo
    const collabEmails = collaborators
      .filter(c => c.club_id === club.id && c.used)
      .map(c => c.email.toLowerCase())

    const filtered = (students ?? []).filter(
      s => !collabEmails.includes((s.email ?? '').toLowerCase())
    )

    setAvailableStudents(filtered)
    setShowCollabModal(true)
    console.log('students trovati:', filtered)
console.log('club id cercato:', club.id)
  }

  async function handleSave() {
    if (!form.name) { setError('Il nome del centro è obbligatorio'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingClub) {
      const { error: updateError } = await supabase
        .from('clubs')
        .update({ name: form.name, whatsapp_number: form.whatsapp_number || null })
        .eq('id', editingClub.id)
      if (updateError) { setError('Errore: ' + updateError.message); setSaving(false); return }
    } else {
      const planLimits: Record<string, number> = { free: 1, starter: 2, pro: 999 }
      const { data: firstClub } = await supabase
        .from('clubs').select('plan').eq('id', clubs[0]?.id).single()
      const plan      = firstClub?.plan ?? 'free'
      const maxCourts = planLimits[plan] ?? 1

      if (clubs.length >= maxCourts) {
        setError(
          plan === 'free'
            ? '⚠️ Piano Free: puoi avere solo 1 centro. Passa a Starter per aggiungerne fino a 2.'
            : '⚠️ Piano Starter: hai raggiunto il limite di 2 centri. Passa a Pro per centri illimitati.'
        )
        setSaving(false)
        return
      }

      const slug = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
      const { data: newClub, error: clubError } = await supabase
        .from('clubs')
        .insert({ name: form.name, slug, plan, max_students: 20, whatsapp_number: form.whatsapp_number || null })
        .select().single()

      if (clubError) { setError('Errore: ' + clubError.message); setSaving(false); return }
      await supabase.from('instructor_clubs').insert({ profile_id: user.id, club_id: newClub.id, role: 'owner' })
    }

    setShowModal(false)
    await loadData()
    refreshClub()
    setSaving(false)
  }

  async function handleAddCollab() {
    if (!selectedStudentId || !selectedClubForCollab) { setCollabError('Seleziona un alunno'); return }
    setSavingCollab(true)
    setCollabError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const student = availableStudents.find(s => s.id === selectedStudentId)
    if (!student?.profile_id) { setCollabError('Alunno non registrato in app'); setSavingCollab(false); return }

    // Aggiunge come manager in instructor_clubs
    const { error: icError } = await supabase
      .from('instructor_clubs')
      .upsert({
        profile_id: student.profile_id,
        club_id:    selectedClubForCollab.id,
        role:       'manager'
      }, { onConflict: 'profile_id,club_id' })

    if (icError) { setCollabError('Errore: ' + icError.message); setSavingCollab(false); return }

    // Promuovi profilo a club_admin
    await supabase.from('profiles')
      .update({ role: 'club_admin' })
      .eq('id', student.profile_id)

    // Registra in collaborator_invites come usato
    await supabase.from('collaborator_invites')
      .upsert({
        email:      student.email,
        club_id:    selectedClubForCollab.id,
        invited_by: user.id,
        used:       true
      }, { onConflict: 'email,club_id' })

    setShowCollabModal(false)
    await loadData()
    setSavingCollab(false)
  }

  async function handleRevokeCollab(collab: Collaborator) {
    if (!confirm(`Revocare l'accesso al collaboratore ${collab.email}?`)) return

    await supabase.from('collaborator_invites').delete().eq('id', collab.id)

    if (collab.used) {
     const { data: profileData } = await supabase
  .rpc('get_profile_by_email', { user_email: collab.email })
  .single()

const pd = profileData as any
if (pd?.profile_id) {
  await supabase.from('instructor_clubs')
    .delete()
    .eq('profile_id', pd.profile_id)
    .eq('club_id', collab.club_id)

  const { data: otherClubs } = await supabase
    .from('instructor_clubs')
    .select('id')
    .eq('profile_id', pd.profile_id)

  if (!otherClubs || otherClubs.length === 0) {
    await supabase.from('profiles')
      .update({ role: 'student' })
      .eq('id', pd.profile_id)
  }
}
    }

    await loadData()
  }

  async function handleDelete(club: Club) {
    if (!confirm(`Eliminare il centro "${club.name}"?\n\nATTENZIONE: verranno eliminati tutti i dati associati.`)) return
    await supabase.from('instructor_clubs').delete().eq('club_id', club.id)
    await supabase.from('lessons').delete().eq('club_id', club.id)
    await supabase.from('students').delete().eq('club_id', club.id)
    await supabase.from('clubs').delete().eq('id', club.id)
    await loadData()
    refreshClub()
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
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: text, background: bg, minHeight: '100vh' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800' }}>Centri</div>
          <div style={{ fontSize: '13px', color: textMuted, marginTop: '4px' }}>
            {clubs.length} {clubs.length === 1 ? 'centro' : 'centri'} attivi
          </div>
        </div>
        {isOwner && (
          <button onClick={openNew}
            style={{ background: pc, border: 'none', color: '#0e1117', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Aggiungi centro
          </button>
        )}
      </div>

      {clubs.length === 0 ? (
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏟️</div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Nessun centro ancora</div>
          <button onClick={openNew}
            style={{ background: pc, border: 'none', color: '#0e1117', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            + Aggiungi centro
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {clubs.map(club => {
            const clubCollabs = collaborators.filter(c => c.club_id === club.id)
            return (
              <div key={club.id} style={{ background: surface, border: `1px solid ${activeClub?.id === club.id ? pc : border}`, borderLeft: `3px solid ${activeClub?.id === club.id ? pc : border}`, borderRadius: '14px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: text }}>{club.name}</div>
                      {activeClub?.id === club.id && (
                        <span style={{ background: `${pc}18`, color: pc, border: `1px solid ${pc}30`, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                          Attivo
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: textMuted, marginBottom: '4px' }}>Piano: {club.plan}</div>
                    {club.whatsapp_number ? (
                      <div style={{ fontSize: '12px', color: '#25D366' }}>📱 {club.whatsapp_number}</div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#e85858' }}>⚠️ Numero WhatsApp non configurato</div>
                    )}

                    {/* Lista collaboratori attivi */}
                    {clubCollabs.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: textMuted, marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Collaboratori ({clubCollabs.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {clubCollabs.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: surface2, borderRadius: '8px', padding: '8px 12px' }}>
                              <div style={{ flex: 1, fontSize: '12px', color: text }}>{c.email}</div>
                              <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: c.used ? 'rgba(56,201,122,0.12)' : 'rgba(245,166,35,0.12)', color: c.used ? '#38c97a' : '#f5a623' }}>
                                {c.used ? '✅ Attivo' : '⏳ In attesa'}
                              </span>
                              <button onClick={() => handleRevokeCollab(c)}
                                style={{ background: 'rgba(232,88,88,0.08)', border: '1px solid rgba(232,88,88,0.15)', color: '#e85858', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>
                                Revoca
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(club)}
                      style={{ background: 'rgba(91,127,255,0.1)', border: '1px solid rgba(91,127,255,0.2)', color: '#5b7fff', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                      ✏️ Modifica
                    </button>
                    {isOwner && (
                      <button onClick={() => openCollabModal(club)}
                        style={{ background: `${pc}10`, border: `1px solid ${pc}30`, color: pc, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                        + Collaboratore
                      </button>
                    )}
                    {clubs.length > 1 && isOwner && (
                      <button onClick={() => handleDelete(club)}
                        style={{ background: 'rgba(232,88,88,0.08)', border: '1px solid rgba(232,88,88,0.15)', color: '#e85858', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                        Elimina
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL CENTRO */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: isMobile ? '20px 20px 0 0' : '20px', padding: '24px', width: '100%', maxWidth: isMobile ? '100%' : '420px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px', color: text }}>
              {editingClub ? 'Modifica centro' : 'Aggiungi centro'}
            </div>
            <div style={{ fontSize: '13px', color: textMuted, marginBottom: '20px' }}>
              {editingClub ? editingClub.name : 'Inserisci i dati del nuovo centro'}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Nome centro *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Es: Padel Club Roma" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Numero WhatsApp notifiche</label>
              <input type="tel" value={form.whatsapp_number}
                onChange={e => setForm({ ...form, whatsapp_number: e.target.value })}
                placeholder="Es: +39 333 1234567" style={inputStyle} />
              <div style={{ fontSize: '11px', color: textMuted, marginTop: '6px' }}>
                Riceverai un WhatsApp quando un alunno prenota in questo centro
              </div>
            </div>

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
                {saving ? 'Salvataggio...' : editingClub ? 'Salva modifiche' : 'Aggiungi centro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COLLABORATORE */}
      {showCollabModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowCollabModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: isMobile ? '20px 20px 0 0' : '20px', padding: '24px', width: '100%', maxWidth: isMobile ? '100%' : '420px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px', color: text }}>
              Aggiungi collaboratore
            </div>
            <div style={{ fontSize: '13px', color: textMuted, marginBottom: '16px' }}>
              {selectedClubForCollab?.name}
            </div>

            <div style={{ background: 'rgba(91,127,255,0.08)', border: '1px solid rgba(91,127,255,0.15)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: textSub, marginBottom: '16px', lineHeight: '1.6' }}>
              💡 Seleziona un alunno già registrato in app. Potrà gestire lezioni, alunni, notifiche e inviti ma non le impostazioni del club.
            </div>

            {availableStudents.length === 0 ? (
              <div style={{ background: surface2, border: `1px solid ${border}`, borderRadius: '8px', padding: '20px', textAlign: 'center', fontSize: '13px', color: textMuted, marginBottom: '16px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>👥</div>
                Nessun alunno registrato disponibile.<br />
                <span style={{ fontSize: '12px' }}>Solo gli alunni che hanno già creato un account possono diventare collaboratori.</span>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Seleziona alunno *</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  style={{ ...inputStyle, outline: 'none' }}>
                  <option value="">Scegli un alunno...</option>
                  {availableStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} — {s.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {collabError && (
              <div style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)', borderRadius: '8px', padding: '10px 12px', color: '#e85858', fontSize: '13px', marginBottom: '16px' }}>{collabError}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowCollabModal(false); setCollabError('') }}
                style={{ flex: 1, padding: '13px', background: 'transparent', border: `1px solid ${border}`, color: textSub, borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
                Annulla
              </button>
              <button
                onClick={handleAddCollab}
                disabled={savingCollab || availableStudents.length === 0 || !selectedStudentId}
                style={{ flex: 2, padding: '13px', background: selectedStudentId && !savingCollab ? pc : surface2, border: 'none', color: '#0e1117', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: selectedStudentId && !savingCollab ? 'pointer' : 'not-allowed', opacity: selectedStudentId && !savingCollab ? 1 : 0.5 }}>
                {savingCollab ? 'Aggiunta...' : '+ Aggiungi collaboratore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
