'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

interface Instructor {
  invite_id: string
  email: string
  club_name: string
  used: boolean
  club_id: string | null
  club_plan: string | null
  plan_expires_at: string | null
  created_at: string
}

interface Club {
  id: string
  name: string
  plan: string
  plan_expires_at: string | null
  created_at: string
}

function SuperAdminContent() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [choosing, setChoosing] = useState(false)
  const [chooseHandled, setChooseHandled] = useState(false)
  const [tab, setTab] = useState<'instructors' | 'clubs'>('instructors')
  const [showAddInstructor, setShowAddInstructor] = useState(false)
  const [newInstructor, setNewInstructor] = useState({ email: '', club_name: '' })
  const [addingInstructor, setAddingInstructor] = useState(false)
  const [editingExpiry, setEditingExpiry] = useState<string | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }

    if (searchParams.get('choose') === 'true' && !chooseHandled) {
      setChooseHandled(true)
      const { data: ic } = await supabase
        .from('instructor_clubs')
        .select('club_id')
        .eq('profile_id', user.id)
        .limit(1)
      if (ic && ic.length > 0) setChoosing(true)
    }

    const { data: invitesData } = await supabase
      .from('club_invites')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: clubsData } = await supabase
      .from('clubs')
      .select('id, name, plan, plan_expires_at, created_at')
      .order('created_at', { ascending: false })

    setClubs(clubsData ?? [])

    const instructorList: Instructor[] = (invitesData ?? []).map((invite: any) => {
      const matchingClub = invite.used
        ? (clubsData ?? []).find((c: any) => c.name === invite.club_name)
        : null

      return {
        invite_id:       invite.id,
        email:           invite.email,
        club_name:       invite.club_name,
        used:            invite.used,
        club_id:         matchingClub?.id ?? null,
        club_plan:       matchingClub?.plan ?? null,
        plan_expires_at: matchingClub?.plan_expires_at ?? null,
        created_at:      invite.created_at
      }
    })

    setInstructors(instructorList)
    setLoading(false)
  }

  async function handleAddInstructor() {
    if (!newInstructor.email || !newInstructor.club_name) {
      alert('Inserisci email e nome club')
      return
    }
    setAddingInstructor(true)

    const { error } = await supabase
      .from('club_invites')
      .upsert({
        email:     newInstructor.email.toLowerCase().trim(),
        club_name: newInstructor.club_name,
        used:      false
      }, { onConflict: 'email' })

    if (error) {
      alert('Errore: ' + error.message)
      setAddingInstructor(false)
      return
    }

    const link = 'https://padelapp-zeta.vercel.app/login'
    const msg  = `Ciao! Il tuo accesso a Remate è stato attivato 🎾\n\nRegistrati qui: ${link}\n\nUsa questa email (${newInstructor.email}) per registrarti.`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')

    setNewInstructor({ email: '', club_name: '' })
    setShowAddInstructor(false)
    await loadData()
    setAddingInstructor(false)
  }

  async function handleChangePlan(clubId: string, plan: string, currentExpiry: string | null) {
    const updates: any = { plan }

    if (plan === 'free') {
      updates.plan_expires_at = null
    } else if (!currentExpiry) {
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + 30)
      updates.plan_expires_at = expiry.toISOString()
    }

    await supabase.from('clubs').update(updates).eq('id', clubId)
    await loadData()
  }

  async function handleSetExpiry(clubId: string) {
    if (!expiryDate) return
    const expiry = new Date(expiryDate)
    expiry.setHours(23, 59, 59)
    await supabase.from('clubs')
      .update({ plan_expires_at: expiry.toISOString() })
      .eq('id', clubId)
    setEditingExpiry(null)
    setExpiryDate('')
    await loadData()
  }

  async function handleRevokeInstructor(instructor: Instructor) {
    if (!confirm(`Revocare l'accesso a ${instructor.email}?\n\nVerranno eliminati il club e tutti i dati associati.`)) return

    await supabase.from('club_invites').delete().eq('id', instructor.invite_id)

    if (instructor.club_id) {
      await supabase.from('instructor_clubs').delete().eq('club_id', instructor.club_id)
      await supabase.from('lessons').delete().eq('club_id', instructor.club_id)
      await supabase.from('students').delete().eq('club_id', instructor.club_id)
      await supabase.from('clubs').delete().eq('id', instructor.club_id)
    }

    await loadData()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function formatExpiry(dateStr: string | null): string {
    if (!dateStr) return '—'
    const d    = new Date(dateStr)
    const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    const label = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
    if (diff < 0)  return `⚠️ Scaduto il ${label}`
    if (diff <= 7) return `⚠️ Scade tra ${diff} giorni`
    return `✓ Scade il ${label}`
  }

  function expiryColor(dateStr: string | null): string {
    if (!dateStr) return '#5a5a6a'
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff < 0)  return '#e85858'
    if (diff <= 7) return '#f5a623'
    return '#38c97a'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  if (choosing) return (
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: '20px' }}>
      <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#c8f53a', marginBottom: '24px' }}>remate●</div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>Come vuoi accedere?</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '32px' }}>Scegli la modalità di accesso</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => setChoosing(false)}
            style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
            ⚙️ Pannello Super Admin
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
            🎾 Dashboard Istruttore
          </button>
        </div>
        <div style={{ marginTop: '20px' }}>
          <span onClick={handleLogout} style={{ fontSize: '13px', color: '#5a5a6a', cursor: 'pointer' }}>Esci →</span>
        </div>
      </div>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 12px',
    background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', color: '#fff', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: '700', color: '#8b93a8',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    display: 'block', marginBottom: '6px'
  }

  const registered = instructors.filter(i => i.used)
  const pending    = instructors.filter(i => !i.used)

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', fontFamily: 'system-ui', color: '#fff' }}>

      {/* Topbar */}
      <div style={{ background: '#161b27', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#c8f53a' }}>remate●</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a' }}>Super Admin</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            🎾 Dashboard
          </button>
          <button onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            Esci
          </button>
        </div>
      </div>

      <div style={{ padding: '32px' }}>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px', maxWidth: '600px' }}>
          {[
            { label: 'Club attivi',       value: clubs.length,      color: '#c8f53a', icon: '🏟️' },
            { label: 'Istruttori attivi', value: registered.length, color: '#38c97a', icon: '🎾' },
            { label: 'In attesa reg.',    value: pending.length,    color: '#f5a623', icon: '⏳' },
          ].map((kpi, i) => (
            <div key={i} style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderTop: `3px solid ${kpi.color}`, borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>{kpi.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: '12px', color: '#5a5a6a', marginTop: '4px' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#1e2535', padding: '4px', borderRadius: '10px', width: 'fit-content', marginBottom: '20px' }}>
          {[
            { value: 'instructors', label: `Istruttori (${instructors.length})` },
            { value: 'clubs',       label: `Club (${clubs.length})` },
          ].map(t => (
            <div key={t.value} onClick={() => setTab(t.value as any)}
              style={{ padding: '8px 18px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: tab === t.value ? '700' : '400', background: tab === t.value ? '#fff' : 'transparent', color: tab === t.value ? '#0e1117' : '#8b93a8' }}>
              {t.label}
            </div>
          ))}
        </div>

        {/* TAB ISTRUTTORI */}
        {tab === 'instructors' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>Gestione istruttori</div>
              <button onClick={() => setShowAddInstructor(true)}
                style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                + Aggiungi istruttore
              </button>
            </div>

            {showAddInstructor && (
              <div style={{ background: '#161b27', border: '1px solid rgba(200,245,58,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: '#c8f53a' }}>➕ Nuovo istruttore</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={labelStyle}>Email istruttore *</label>
                    <input type="email" value={newInstructor.email}
                      onChange={e => setNewInstructor({ ...newInstructor, email: e.target.value })}
                      placeholder="istruttore@email.it" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nome club *</label>
                    <input type="text" value={newInstructor.club_name}
                      onChange={e => setNewInstructor({ ...newInstructor, club_name: e.target.value })}
                      placeholder="Es: ASD Padel Roma" style={inputStyle} />
                  </div>
                </div>
                <div style={{ background: 'rgba(200,245,58,0.06)', border: '1px solid rgba(200,245,58,0.15)', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#8b93a8', marginBottom: '16px', lineHeight: '1.6' }}>
                  💡 Dopo aver cliccato "Aggiungi", si aprirà WhatsApp con il link da mandare all'istruttore.
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setShowAddInstructor(false); setNewInstructor({ email: '', club_name: '' }) }}
                    style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    Annulla
                  </button>
                  <button onClick={handleAddInstructor} disabled={addingInstructor}
                    style={{ flex: 2, padding: '12px', background: addingInstructor ? '#5a7a20' : '#c8f53a', border: 'none', color: '#0e1117', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: addingInstructor ? 'not-allowed' : 'pointer' }}>
                    {addingInstructor ? 'Aggiunta...' : '📱 Aggiungi e manda WhatsApp'}
                  </button>
                </div>
              </div>
            )}

            {instructors.length === 0 ? (
              <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#5a5a6a' }}>
                Nessun istruttore ancora. Clicca "+ Aggiungi istruttore" per iniziare.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {instructors.map(instructor => (
                  <div key={instructor.invite_id} style={{
                    background: '#161b27',
                    border: `1px solid ${instructor.used ? 'rgba(56,201,122,0.2)' : 'rgba(245,166,35,0.2)'}`,
                    borderRadius: '14px', padding: '18px 20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '15px', fontWeight: '700' }}>{instructor.email}</div>
                          <span style={{
                            fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                            background: instructor.used ? 'rgba(56,201,122,0.12)' : 'rgba(245,166,35,0.12)',
                            color: instructor.used ? '#38c97a' : '#f5a623'
                          }}>
                            {instructor.used ? '✅ Registrato' : '⏳ In attesa'}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '10px' }}>
                          🏟️ {instructor.club_name}
                        </div>

                        {instructor.used && instructor.club_id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <select
                              value={instructor.club_plan ?? 'free'}
                              onChange={e => handleChangePlan(instructor.club_id!, e.target.value, instructor.plan_expires_at)}
                              style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.12)', color: '#c8f53a', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', outline: 'none', cursor: 'pointer' }}>
                              <option value="free">🆓 Free</option>
                              <option value="starter">⭐ Starter €29/mese</option>
                              <option value="pro">💎 Pro €69/mese</option>
                            </select>

                            {instructor.club_plan !== 'free' && (
                              <>
                                {editingExpiry === instructor.club_id ? (
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <input type="date" value={expiryDate}
                                      onChange={e => setExpiryDate(e.target.value)}
                                      style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '5px 8px', borderRadius: '6px', fontSize: '12px', outline: 'none' }} />
                                    <button onClick={() => handleSetExpiry(instructor.club_id!)}
                                      style={{ background: '#38c97a', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>✓</button>
                                    <button onClick={() => { setEditingExpiry(null); setExpiryDate('') }}
                                      style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8b93a8', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                                  </div>
                                ) : (
                                  <div onClick={() => {
                                    setEditingExpiry(instructor.club_id!)
                                    setExpiryDate(instructor.plan_expires_at ? new Date(instructor.plan_expires_at).toISOString().split('T')[0] : '')
                                  }}
                                    style={{ fontSize: '12px', color: expiryColor(instructor.plan_expires_at), cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {formatExpiry(instructor.plan_expires_at)}
                                    <span style={{ color: '#5b7fff', fontSize: '11px' }}>✏️</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {!instructor.used && (
                          <button onClick={() => {
                            const link = 'https://padelapp-zeta.vercel.app/login'
                            const msg  = `Ciao! Il tuo accesso a Remate è stato attivato 🎾\n\nRegistrati qui: ${link}\n\nUsa questa email (${instructor.email}) per registrarti.`
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                          }}
                            style={{ background: '#25D366', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                            📱 Manda link
                          </button>
                        )}
                        <button onClick={() => handleRevokeInstructor(instructor)}
                          style={{ background: 'rgba(232,88,88,0.08)', border: '1px solid rgba(232,88,88,0.15)', color: '#e85858', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                          Revoca
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CLUB */}
        {tab === 'clubs' && (
          <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
            {clubs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#5a5a6a' }}>Nessun club ancora</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1e2535' }}>
                    {['Club', 'Piano', 'Scadenza', 'Creato il', 'Azioni'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clubs.map(club => (
                    <tr key={club.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '600' }}>{club.name}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <select value={club.plan}
                          onChange={async e => handleChangePlan(club.id, e.target.value, club.plan_expires_at)}
                          style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', outline: 'none' }}>
                          <option value="free">Free</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: expiryColor(club.plan_expires_at) }}>
                        {club.plan === 'free' ? '—' : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{formatExpiry(club.plan_expires_at)}</span>
                            <span onClick={() => {
                              setEditingExpiry(club.id)
                              setExpiryDate(club.plan_expires_at ? new Date(club.plan_expires_at).toISOString().split('T')[0] : '')
                            }} style={{ color: '#5b7fff', cursor: 'pointer', fontSize: '11px' }}>✏️</span>
                            {editingExpiry === club.id && (
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                                  style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '4px 6px', borderRadius: '4px', fontSize: '11px', outline: 'none' }} />
                                <button onClick={() => handleSetExpiry(club.id)}
                                  style={{ background: '#38c97a', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>✓</button>
                                <button onClick={() => { setEditingExpiry(null); setExpiryDate('') }}
                                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8b93a8', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#8b93a8' }}>
                        {new Date(club.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button onClick={async () => {
                          if (!confirm(`Eliminare il club "${club.name}"?`)) return
                          await supabase.from('instructor_clubs').delete().eq('club_id', club.id)
                          await supabase.from('lessons').delete().eq('club_id', club.id)
                          await supabase.from('students').delete().eq('club_id', club.id)
                          await supabase.from('clubs').delete().eq('id', club.id)
                          await loadData()
                        }}
                          style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.2)', color: '#e85858', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SuperAdminPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8f53a', fontFamily: 'system-ui' }}>
        Caricamento...
      </div>
    }>
      <SuperAdminContent />
    </Suspense>
  )
}