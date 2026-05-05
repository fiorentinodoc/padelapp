'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Club {
  id: string
  name: string
  slug: string
  plan: string
  max_students: number
  role: string
  created_at: string
}

export default function CentriPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [form, setForm] = useState({ name: '', address: '' })
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

    const { data: instructorClubs } = await supabase
      .from('instructor_clubs')
      .select('role, clubs(*)')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: true })

    if (instructorClubs) {
      setClubs(instructorClubs.map((ic: any) => ({
        ...ic.clubs,
        role: ic.role
      })))
    }

    setLoading(false)
  }

  async function handleSave() {
    if (!form.name) { setError('Il nome del centro è obbligatorio'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const slug = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()

    // Crea il nuovo club
    const { data: newClub, error: clubError } = await supabase
      .from('clubs')
      .insert({ name: form.name, slug, plan: 'free', max_students: 20 })
      .select()
      .single()

    if (clubError) { setError('Errore: ' + clubError.message); setSaving(false); return }

    // Collega l'istruttore come owner
    await supabase.from('instructor_clubs').insert({
      profile_id: user.id,
      club_id:    newClub.id,
      role:       'owner'
    })

    setShowModal(false)
    setForm({ name: '', address: '' })
    await loadData()
    setSaving(false)
  }

  async function handleDelete(clubId: string) {
    if (!confirm('Eliminare questo centro? Verranno eliminati anche tutti i dati associati.')) return

    await supabase.from('instructor_clubs').delete().eq('club_id', clubId)
    await supabase.from('clubs').delete().eq('id', clubId)
    await loadData()
  }

  function setActive(club: Club) {
    localStorage.setItem('activeClubId', club.id)
    router.push('/dashboard')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: '#fff' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800' }}>I tuoi centri</div>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>{clubs.length} {clubs.length === 1 ? 'centro' : 'centri'} configurati</div>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Aggiungi centro
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {clubs.map(club => (
          <div key={club.id} style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(200,245,58,0.12)', border: '1px solid rgba(200,245,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: '#c8f53a', flexShrink: 0 }}>
                  {club.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{club.name}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', background: club.role === 'owner' ? 'rgba(200,245,58,0.1)' : 'rgba(91,127,255,0.1)', color: club.role === 'owner' ? '#c8f53a' : '#5b7fff', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                      {club.role === 'owner' ? '👑 Proprietario' : '👤 Manager'}
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', color: '#8b93a8', padding: '2px 8px', borderRadius: '6px' }}>
                      Piano {club.plan}
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', color: '#8b93a8', padding: '2px 8px', borderRadius: '6px' }}>
                      Max {club.max_students} alunni
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Azioni */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
              <button onClick={() => setActive(club)}
                style={{ flex: 1, background: 'rgba(200,245,58,0.1)', border: '1px solid rgba(200,245,58,0.2)', color: '#c8f53a', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ▦ Gestisci
              </button>
              <button onClick={() => router.push('/dashboard/lezioni')}
                style={{ flex: 1, background: 'rgba(91,127,255,0.08)', border: '1px solid rgba(91,127,255,0.2)', color: '#5b7fff', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                📅 Lezioni
              </button>
              {club.role === 'owner' && (
                <button onClick={() => handleDelete(club.id)}
                  style={{ background: 'rgba(232,88,88,0.08)', border: '1px solid rgba(232,88,88,0.2)', color: '#e85858', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Elimina
                </button>
              )}
            </div>
          </div>
        ))}

        {clubs.length === 0 && (
          <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏟️</div>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Nessun centro ancora</div>
            <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '24px' }}>Aggiungi il tuo primo centro padel</div>
            <button onClick={() => setShowModal(true)}
              style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              + Aggiungi centro
            </button>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }}>
          <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: isMobile ? '20px 20px 0 0' : '20px', padding: '28px', width: '100%', maxWidth: isMobile ? '100%' : '440px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Nuovo centro</div>
            <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '24px' }}>Aggiungi un nuovo centro padel</div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Nome centro *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Es: Padel Club Roma Nord"
                style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Indirizzo</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Es: Via Roma 1, Milano"
                style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
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
                {saving ? 'Salvataggio...' : 'Crea centro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}