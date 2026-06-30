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

export default function CentriPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [isMobile, setIsMobile] = useState(false)
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
      .select('clubs(id, name, plan, whatsapp_number)')
      .eq('profile_id', user.id)

    const clubList = ic?.map((c: any) => c.clubs).filter(Boolean) ?? []
    setClubs(clubList)
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

  async function handleSave() {
    if (!form.name) { setError('Il nome del centro è obbligatorio'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingClub) {
      const { error: updateError } = await supabase
        .from('clubs')
        .update({
          name:             form.name,
          whatsapp_number:  form.whatsapp_number || null
        })
        .eq('id', editingClub.id)

      if (updateError) { setError('Errore: ' + updateError.message); setSaving(false); return }
    } else {
      const planLimits: Record<string, number> = { free: 1, starter: 3, pro: 999 }
      const { data: firstClub } = await supabase
        .from('clubs').select('plan').eq('id', clubs[0]?.id).single()

      const plan      = firstClub?.plan ?? 'free'
      const maxCourts = planLimits[plan] ?? 1

      if (clubs.length >= maxCourts) {
        setError(
          plan === 'free'
            ? '⚠️ Piano Free: puoi avere solo 1 centro. Passa a Starter per aggiungerne fino a 3.'
            : '⚠️ Piano Starter: hai raggiunto il limite di 3 centri. Passa a Pro per centri illimitati.'
        )
        setSaving(false)
        return
      }

      const slug = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
      const { data: newClub, error: clubError } = await supabase
        .from('clubs')
        .insert({
          name:            form.name,
          slug,
          plan,
          max_students:    20,
          whatsapp_number: form.whatsapp_number || null
        })
        .select()
        .single()

      if (clubError) { setError('Errore: ' + clubError.message); setSaving(false); return }

      await supabase.from('instructor_clubs').insert({
        profile_id: user.id, club_id: newClub.id, role: 'owner'
      })
    }

    setShowModal(false)
    await loadData()
    refreshClub()
    setSaving(false)
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
        <button onClick={openNew}
          style={{ background: pc, border: 'none', color: '#0e1117', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Aggiungi centro
        </button>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {clubs.map(club => (
            <div key={club.id} style={{ background: surface, border: `1px solid ${activeClub?.id === club.id ? pc : border}`, borderLeft: `3px solid ${activeClub?.id === club.id ? pc : border}`, borderRadius: '14px', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: text }}>{club.name}</div>
                    {activeClub?.id === club.id && (
                      <span style={{ background: `${pc}18`, color: pc, border: `1px solid ${pc}30`, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                        Attivo
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: textMuted, marginBottom: club.whatsapp_number ? '4px' : '0' }}>
                    Piano: {club.plan}
                  </div>
                  {club.whatsapp_number && (
                    <div style={{ fontSize: '12px', color: '#25D366', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📱 {club.whatsapp_number}
                    </div>
                  )}
                  {!club.whatsapp_number && (
                    <div style={{ fontSize: '11px', color: '#e85858', marginTop: '2px' }}>
                      ⚠️ Numero WhatsApp non configurato
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => openEdit(club)}
                    style={{ background: 'rgba(91,127,255,0.1)', border: '1px solid rgba(91,127,255,0.2)', color: '#5b7fff', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                    ✏️ Modifica
                  </button>
                  {clubs.length > 1 && (
                    <button onClick={() => handleDelete(club)}
                      style={{ background: 'rgba(232,88,88,0.08)', border: '1px solid rgba(232,88,88,0.15)', color: '#e85858', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      Elimina
                    </button>
                  )}
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
              <input
                type="tel"
                value={form.whatsapp_number}
                onChange={e => setForm({ ...form, whatsapp_number: e.target.value })}
                placeholder="Es: +39 333 1234567"
                style={inputStyle} />
              <div style={{ fontSize: '11px', color: textMuted, marginTop: '6px' }}>
                Riceverai un messaggio WhatsApp quando un alunno prenota una lezione in questo centro
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
    </div>
  )
}