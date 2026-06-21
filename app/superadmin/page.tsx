'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

interface Club {
  id: string
  name: string
  plan: string
  created_at: string
}

function SuperAdminContent() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [choosing, setChoosing] = useState(false)
  const [tab, setTab] = useState<'instructors' | 'clubs'>('instructors')
  const [showAddInstructor, setShowAddInstructor] = useState(false)
  const [newInstructor, setNewInstructor] = useState({ email: '', club_name: '' })
  const [addingInstructor, setAddingInstructor] = useState(false)
  const [invites, setInvites] = useState<any[]>([])
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

    if (searchParams.get('choose') === 'true') {
      const { data: ic } = await supabase
        .from('instructor_clubs')
        .select('club_id')
        .eq('profile_id', user.id)
        .limit(1)

      if (ic && ic.length > 0) setChoosing(true)
    }

    const { data: clubsData } = await supabase
      .from('clubs')
      .select('id, name, plan, created_at')
      .order('created_at', { ascending: false })

    setClubs(clubsData ?? [])

    const { data: invitesData } = await supabase
      .from('club_invites')
      .select('*')
      .order('created_at', { ascending: false })

    setInvites(invitesData ?? [])
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
    } else {
      const link = 'https://padelapp-zeta.vercel.app/login'
      const msg  = `Ciao! Il tuo accesso a Remate è stato attivato 🎾\n\nRegistrati qui: ${link}\n\nUsa questa email (${newInstructor.email}) per registrarti.`
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
      setNewInstructor({ email: '', club_name: '' })
      setShowAddInstructor(false)
      await loadData()
    }
    setAddingInstructor(false)
  }

  async function handleRevokeInvite(invite: any) {
    if (!confirm(`Revocare l'accesso a ${invite.email}?`)) return
    await supabase.from('club_invites').delete().eq('id', invite.id)
    await loadData()
  }

  async function handleDeleteClub(club: Club) {
    if (!confirm(`Eliminare il club "${club.name}"?\n\nATTENZIONE: verranno eliminati tutti i dati associati.`)) return
    await supabase.from('instructor_clubs').delete().eq('club_id', club.id)
    await supabase.from('lessons').delete().eq('club_id', club.id)
    await supabase.from('students').delete().eq('club_id', club.id)
    await supabase.from('clubs').delete().eq('id', club.id)
    await loadData()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
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
            { label: 'Club attivi',       value: clubs.length,                              color: '#c8f53a', icon: '🏟️' },
            { label: 'Istruttori attivi', value: invites.filter(i => i.used).length,        color: '#38c97a', icon: '🎾' },
            { label: 'In attesa',         value: invites.filter(i => !i.used).length,       color: '#f5a623', icon: '⏳' },
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
            { value: 'instructors', label: 'Istruttori' },
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

            {/* Form aggiungi istruttore */}
            {showAddInstructor && (
              <div style={{ background: '#161b27', border: '1px solid rgba(200,245,58,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: '#c8f53a' }}>
                  ➕ Nuovo istruttore
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={labelStyle}>Email istruttore *</label>
                    <input
                      type="email"
                      value={newInstructor.email}
                      onChange={e => setNewInstructor({ ...newInstructor, email: e.target.value })}
                      placeholder="istruttore@email.it"
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nome club *</label>
                    <input
                      type="text"
                      value={newInstructor.club_name}
                      onChange={e => setNewInstructor({ ...newInstructor, club_name: e.target.value })}
                      placeholder="Es: ASD Padel Roma"
                      style={inputStyle} />
                  </div>
                </div>
                <div style={{ background: 'rgba(200,245,58,0.06)', border: '1px solid rgba(200,245,58,0.15)', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#8b93a8', marginBottom: '16px', lineHeight: '1.6' }}>
                  💡 Dopo aver cliccato "Aggiungi", si aprirà WhatsApp con il link di registrazione da mandare all'istruttore. L'istruttore si registra e il sistema lo riconosce automaticamente.
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

            {/* Lista inviti */}
            {invites.length === 0 ? (
              <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#5a5a6a' }}>
                Nessun istruttore ancora. Clicca "+ Aggiungi istruttore" per iniziare.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {invites.map(invite => (
                  <div key={invite.id} style={{ background: '#161b27', border: `1px solid ${invite.used ? 'rgba(56,201,122,0.2)' : 'rgba(245,166,35,0.2)'}`, borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '700' }}>{invite.email}</div>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                          background: invite.used ? 'rgba(56,201,122,0.12)' : 'rgba(245,166,35,0.12)',
                          color: invite.used ? '#38c97a' : '#f5a623'
                        }}>
                          {invite.used ? '✅ Registrato' : '⏳ In attesa'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#5a5a6a' }}>🏟️ {invite.club_name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!invite.used && (
                        <button
                          onClick={() => {
                            const link = 'https://padelapp-zeta.vercel.app/login'
                            const msg  = `Ciao! Il tuo accesso a Remate è stato attivato 🎾\n\nRegistrati qui: ${link}\n\nUsa questa email (${invite.email}) per registrarti.`
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                          }}
                          style={{ background: '#25D366', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          📱 Rimanda link
                        </button>
                      )}
                      <button onClick={() => handleRevokeInvite(invite)}
                        style={{ background: 'rgba(232,88,88,0.08)', border: '1px solid rgba(232,88,88,0.15)', color: '#e85858', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                        Revoca
                      </button>
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
              <div style={{ padding: '40px', textAlign: 'center', color: '#5a5a6a' }}>
                Nessun club ancora
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1e2535' }}>
                    {['Club', 'Piano', 'Creato il', 'Azioni'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clubs.map(club => (
                    <tr key={club.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '600' }}>{club.name}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <select
                          value={club.plan}
                          onChange={async e => {
                            await supabase.from('clubs').update({ plan: e.target.value }).eq('id', club.id)
                            await loadData()
                          }}
                          style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', outline: 'none' }}>
                          <option value="free">Free</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#8b93a8' }}>
                        {new Date(club.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button onClick={() => handleDeleteClub(club)}
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