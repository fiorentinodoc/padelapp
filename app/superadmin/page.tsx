'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Request {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  club_name: string
  city: string | null
  message: string | null
  status: string
  created_at: string
}

interface Club {
  id: string
  name: string
  plan: string
  created_at: string
}

export default function SuperAdminPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'requests' | 'clubs'>('requests')
  const [approving, setApproving] = useState<string | null>(null)
  const router = useRouter()
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

    const { data: reqs } = await supabase
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false })

    setRequests(reqs ?? [])

    const { data: clubsData } = await supabase
      .from('clubs')
      .select('id, name, plan, created_at')
      .order('created_at', { ascending: false })

    setClubs(clubsData ?? [])
    setLoading(false)
  }

  async function handleApprove(req: Request) {
    setApproving(req.id)

    // Inserisci in club_invites
    const { error } = await supabase
      .from('club_invites')
      .upsert({
        email:     req.email,
        club_name: req.club_name,
        used:      false
      }, { onConflict: 'email' })

    if (error) {
      alert('Errore: ' + error.message)
      setApproving(null)
      return
    }

    // Aggiorna status richiesta
    await supabase
      .from('access_requests')
      .update({ status: 'approved' })
      .eq('id', req.id)

    await loadData()
    setApproving(null)
    alert(`✅ Approvato! ${req.email} può ora registrarsi come istruttore.`)
  }

  async function handleReject(req: Request) {
    if (!confirm(`Rifiutare la richiesta di ${req.first_name} ${req.last_name}?`)) return

    await supabase
      .from('access_requests')
      .update({ status: 'rejected' })
      .eq('id', req.id)

    await loadData()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const pending  = requests.filter(r => r.status === 'pending')
  const approved = requests.filter(r => r.status === 'approved')
  const rejected = requests.filter(r => r.status === 'rejected')

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', fontFamily: 'system-ui', color: '#fff' }}>

      {/* Topbar */}
      <div style={{ background: '#161b27', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#c8f53a' }}>padel●</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a' }}>Super Admin</div>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
          Esci
        </button>
      </div>

      <div style={{ padding: '32px' }}>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
          {[
            { label: 'Richieste in attesa', value: pending.length,  color: '#f5a623', icon: '⏳' },
            { label: 'Approvate',           value: approved.length, color: '#38c97a', icon: '✅' },
            { label: 'Rifiutate',           value: rejected.length, color: '#e85858', icon: '❌' },
            { label: 'Club attivi',         value: clubs.length,    color: '#c8f53a', icon: '🏟️' },
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
            { value: 'requests', label: `Richieste ${pending.length > 0 ? `(${pending.length} in attesa)` : ''}` },
            { value: 'clubs',    label: `Club attivi (${clubs.length})` },
          ].map(t => (
            <div key={t.value} onClick={() => setTab(t.value as any)}
              style={{ padding: '8px 18px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: tab === t.value ? '700' : '400', background: tab === t.value ? '#fff' : 'transparent', color: tab === t.value ? '#0e1117' : '#8b93a8' }}>
              {t.label}
            </div>
          ))}
        </div>

        {/* RICHIESTE */}
        {tab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.length === 0 ? (
              <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#5a5a6a' }}>
                Nessuna richiesta ancora
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} style={{ background: '#161b27', border: `1px solid ${req.status === 'pending' ? 'rgba(245,166,35,0.2)' : req.status === 'approved' ? 'rgba(56,201,122,0.2)' : 'rgba(232,88,88,0.15)'}`, borderRadius: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '16px', fontWeight: '700' }}>{req.first_name} {req.last_name}</div>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                          background: req.status === 'pending' ? 'rgba(245,166,35,0.12)' : req.status === 'approved' ? 'rgba(56,201,122,0.12)' : 'rgba(232,88,88,0.1)',
                          color: req.status === 'pending' ? '#f5a623' : req.status === 'approved' ? '#38c97a' : '#e85858'
                        }}>
                          {req.status === 'pending' ? '⏳ In attesa' : req.status === 'approved' ? '✅ Approvato' : '❌ Rifiutato'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#8b93a8', marginBottom: '6px' }}>
                        <span>📧 {req.email}</span>
                        {req.phone && <span>📱 {req.phone}</span>}
                        {req.city && <span>📍 {req.city}</span>}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#c8f53a', marginBottom: req.message ? '6px' : '0' }}>
                        🏟️ {req.club_name}
                      </div>
                      {req.message && (
                        <div style={{ fontSize: '13px', color: '#5a5a6a', fontStyle: 'italic' }}>"{req.message}"</div>
                      )}
                      <div style={{ fontSize: '11px', color: '#5a5a6a', marginTop: '8px' }}>
                        {new Date(req.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={approving === req.id}
                          style={{ background: '#38c97a', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {approving === req.id ? '...' : '✅ Approva'}
                        </button>
                        <button
                          onClick={() => handleReject(req)}
                          style={{ background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.2)', color: '#e85858', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          ❌ Rifiuta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CLUB */}
        {tab === 'clubs' && (
          <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e2535' }}>
                  {['Club', 'Piano', 'Creato il'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clubs.map(club => (
                  <tr key={club.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600' }}>{club.name}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: club.plan === 'pro' ? 'rgba(200,245,58,0.12)' : 'rgba(255,255,255,0.06)', color: club.plan === 'pro' ? '#c8f53a' : '#8b93a8', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                        {club.plan}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#8b93a8' }}>
                      {new Date(club.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}