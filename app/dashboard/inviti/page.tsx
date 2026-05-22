'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useClub, useTheme } from '../club-context'

interface JoinCode {
  id: string
  code: string
  club_id: string
  uses: number
  max_uses: number
  active: boolean
  created_at: string
}

export default function InvitiPage() {
  const [codes, setCodes] = useState<JoinCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
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

  useEffect(() => {
    if (activeClub) loadData()
  }, [activeClub])

  async function loadData() {
    if (!activeClub) return
    setLoading(true)
    const { data } = await supabase
      .from('join_codes')
      .select('*')
      .eq('club_id', activeClub.id)
      .order('created_at', { ascending: false })
    setCodes(data ?? [])
    setLoading(false)
  }

  async function generateCode() {
    if (!activeClub) return
    setGenerating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const { error } = await supabase.from('join_codes').insert({
      code, club_id: activeClub.id, created_by: user.id, max_uses: 100, active: true
    })
    if (error) alert('Errore: ' + error.message)
    else await loadData()
    setGenerating(false)
  }

  async function toggleCode(code: JoinCode) {
    await supabase.from('join_codes').update({ active: !code.active }).eq('id', code.id)
    await loadData()
  }

  async function deleteCode(code: JoinCode) {
    if (!confirm('Eliminare questo link invito?')) return
    await supabase.from('join_codes').delete().eq('id', code.id)
    await loadData()
  }

  function copyLink(code: string) {
    const link = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(link)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function shareWhatsApp(code: string) {
    const link    = `${window.location.origin}/join/${code}`
    const message = `Ciao! Ti invito a unirti al club *${activeClub?.name}* sulla nostra app.\n\nRegistrati qui: ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: pc, fontFamily: 'system-ui', background: bg }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: text, background: bg, minHeight: '100vh' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800' }}>Link invito</div>
          <div style={{ fontSize: '13px', color: textMuted, marginTop: '4px' }}>
            Genera link da mandare agli alunni per unirsi a {activeClub?.name}
          </div>
        </div>
        <button onClick={generateCode} disabled={generating}
          style={{ background: generating ? '#5a7a20' : pc, border: 'none', color: '#0e1117', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: generating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {generating ? 'Generazione...' : '+ Genera nuovo link'}
        </button>
      </div>

      {/* Come funziona */}
      <div style={{ background: 'rgba(91,127,255,0.08)', border: '1px solid rgba(91,127,255,0.15)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#5b7fff', marginBottom: '8px' }}>💡 Come funziona</div>
        <div style={{ fontSize: '13px', color: textSub, lineHeight: '1.7' }}>
          1. Clicca <strong style={{ color: text }}>"Genera nuovo link"</strong><br />
          2. Manda il link su WhatsApp agli alunni<br />
          3. L'alunno clicca il link, si registra e viene automaticamente collegato a <strong style={{ color: text }}>{activeClub?.name}</strong><br />
          4. Puoi disattivare un link in qualsiasi momento
        </div>
      </div>

      {/* Lista codici */}
      {codes.length === 0 ? (
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '16px', padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔗</div>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Nessun link ancora</div>
          <div style={{ fontSize: '13px', color: textMuted, marginBottom: '20px' }}>Genera il primo link invito per i tuoi alunni</div>
          <button onClick={generateCode}
            style={{ background: pc, border: 'none', color: '#0e1117', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            + Genera link
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {codes.map(code => {
            const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://padelapp-zeta.vercel.app'}/join/${code.code}`
            return (
              <div key={code.id} style={{ background: surface, border: `1px solid ${border}`, borderRadius: '14px', padding: '18px 20px', opacity: code.active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: surface2, borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: pc, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {link}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: textMuted }}>
                      <span>👥 {code.uses} iscrizioni</span>
                      <span>📅 {new Date(code.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span style={{ color: code.active ? '#38c97a' : '#e85858', fontWeight: '600' }}>
                        {code.active ? '✓ Attivo' : '✗ Disattivato'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => copyLink(code.code)}
                      style={{ background: copied === code.code ? 'rgba(56,201,122,0.15)' : surface2, border: `1px solid ${copied === code.code ? 'rgba(56,201,122,0.3)' : border}`, color: copied === code.code ? '#38c97a' : text, padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {copied === code.code ? '✓ Copiato!' : '📋 Copia'}
                    </button>
                    <button onClick={() => shareWhatsApp(code.code)}
                      style={{ background: '#25D366', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      📱 WhatsApp
                    </button>
                    <button onClick={() => toggleCode(code)}
                      style={{ background: surface2, border: `1px solid ${border}`, color: textSub, padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {code.active ? 'Disattiva' : 'Riattiva'}
                    </button>
                    <button onClick={() => deleteCode(code)}
                      style={{ background: 'rgba(232,88,88,0.08)', border: '1px solid rgba(232,88,88,0.15)', color: '#e85858', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Elimina
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}