'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface NotifLog {
  id: string
  title: string
  body: string
  type: string
  delivered: boolean
  sent_at: string
}

export default function NotifichePage() {
  const [logs, setLogs] = useState<NotifLog[]>([])
  const [club, setClub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ target: 'all', message: '' })
  const [isMobile, setIsMobile] = useState(false)
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id, clubs(id, name)')
      .eq('id', user.id)
      .single()

    if (profile?.clubs) {
      setClub(profile.clubs as any)
      const { data } = await supabase
        .from('notifications_log')
        .select('*')
        .eq('club_id', (profile.clubs as any).id)
        .order('sent_at', { ascending: false })
        .limit(50)
      setLogs(data ?? [])
    }
    setLoading(false)
  }

  async function handleSend() {
    if (!form.message.trim() || !club) return
    setSending(true)
    setSuccess('')

    await supabase.from('notifications_log').insert({
      club_id:   club.id,
      title:     '📢 Comunicazione istruttore',
      body:      form.message,
      type:      'manual',
      delivered: true,
    })

    setSuccess('Notifica salvata! In produzione verrà inviata via push agli alunni.')
    setForm({ ...form, message: '' })
    await loadData()
    setSending(false)
  }

  const typeLabel: Record<string, string> = {
    spot_available: '🎾 Posto libero',
    reminder:       '⏰ Reminder',
    manual:         '📢 Manuale',
    welcome:        '👋 Benvenuto',
  }
  const typeColor: Record<string, string> = {
    spot_available: '#e85858',
    reminder:       '#5b7fff',
    manual:         '#f5a623',
    welcome:        '#38c97a',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: '#fff' }}>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>Notifiche</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>{logs.length} notifiche nel log</div>
      </div>

      {/* Invio manuale */}
      <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>📲 Invia notifica manuale</div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Destinatari</label>
          <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value })}
            style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}>
            <option value="all">Tutti gli alunni</option>
            <option value="beginner">Solo Principianti</option>
            <option value="intermediate">Solo Intermedi</option>
            <option value="advanced">Solo Avanzati</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Messaggio</label>
          <input value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
            placeholder="Es: Lezione di sabato spostata alle 11:00"
            style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {success && (
          <div style={{ background: 'rgba(56,201,122,0.1)', border: '1px solid rgba(56,201,122,0.3)', borderRadius: '8px', padding: '10px 12px', color: '#38c97a', fontSize: '13px', marginBottom: '14px' }}>
            {success}
          </div>
        )}

        <button onClick={handleSend} disabled={sending || !form.message.trim()}
          style={{ background: form.message.trim() ? '#c8f53a' : '#2a3020', border: 'none', color: form.message.trim() ? '#0e1117' : '#5a5a6a', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: form.message.trim() ? 'pointer' : 'not-allowed' }}>
          {sending ? 'Invio...' : '📲 Invia push'}
        </button>
      </div>

      {/* Storico */}
      <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>Storico notifiche</div>

      {logs.length === 0 ? (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#5a5a6a', fontSize: '14px' }}>
          Nessuna notifica ancora inviata
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {logs.map(log => (
            <div key={log.id} style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: typeColor[log.type] ?? '#8b93a8', marginTop: '5px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>{log.title}</div>
                <div style={{ fontSize: '12px', color: '#8b93a8', marginBottom: '6px' }}>{log.body}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', background: `${typeColor[log.type] ?? '#8b93a8'}18`, color: typeColor[log.type] ?? '#8b93a8', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                    {typeLabel[log.type] ?? log.type}
                  </span>
                  {log.delivered && (
                    <span style={{ fontSize: '11px', background: 'rgba(56,201,122,0.1)', color: '#38c97a', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>✓ Consegnata</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#5a5a6a', flexShrink: 0 }}>
                {new Date(log.sent_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}