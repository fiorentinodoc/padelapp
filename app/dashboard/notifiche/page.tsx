'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useClub } from '../club-context'

interface Cancellation {
  booking_id: string
  student_name: string
  lesson_title: string
  lesson_date: string
  lesson_time: string
  court: string
  level: string
  lesson_id: string
  club_id: string
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  level: string
}

export default function NotifichePage() {
  const [cancellations, setCancellations] = useState<Cancellation[]>([])
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({})
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [manualForm, setManualForm] = useState({ target: 'all', message: '' })
  const [manualCandidates, setManualCandidates] = useState<Candidate[]>([])
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
    setLoading(true)

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const now   = new Date().toISOString()

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, student_id, lesson_id, cancelled_at, students(first_name, last_name), lessons(title, starts_at, court, level, club_id, max_spots)')
      .eq('status', 'cancelled')
      .gte('cancelled_at', since)
      .not('lessons', 'is', null)

    if (!bookings) { setLoading(false); return }

    const relevant = bookings.filter((b: any) =>
      b.lessons &&
      b.lessons.club_id === activeClub.id &&
      b.lessons.starts_at >= now
    )

    const cancList: Cancellation[] = relevant.map((b: any) => ({
      booking_id:   b.id,
      student_name: `${b.students?.first_name ?? ''} ${b.students?.last_name ?? ''}`.trim(),
      lesson_title: b.lessons.title,
      lesson_date:  new Date(b.lessons.starts_at).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
      lesson_time:  new Date(b.lessons.starts_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      court:        b.lessons.court,
      level:        b.lessons.level,
      lesson_id:    b.lesson_id,
      club_id:      b.lessons.club_id,
    }))

    setCancellations(cancList)

    const candMap: Record<string, Candidate[]> = {}
    for (const c of cancList) {
      const { data: booked } = await supabase
        .from('bookings')
        .select('student_id')
        .eq('lesson_id', c.lesson_id)
        .eq('status', 'confirmed')

      const excludeIds = booked?.map((b: any) => b.student_id) ?? []

      let query = supabase
        .from('students')
        .select('id, first_name, last_name, phone, level')
        .eq('club_id', c.club_id)
        .eq('level', c.level)
        .eq('status', 'active')

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`)
      }

      const { data: cands } = await query
      candMap[c.booking_id] = (cands ?? []).filter((s: any) => s.phone)
    }

    setCandidates(candMap)
    setLoading(false)
  }

  async function loadManualCandidates(target: string) {
    if (!activeClub) return
    let query = supabase
      .from('students')
      .select('id, first_name, last_name, phone, level')
      .eq('club_id', activeClub.id)
      .eq('status', 'active')
      .not('phone', 'is', null)

    if (target !== 'all') {
      query = query.eq('level', target)
    }

    const { data } = await query
    setManualCandidates(data ?? [])
  }

  function buildWhatsAppLink(phone: string, message: string): string {
    const cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
    const encoded = encodeURIComponent(message)
    return `https://wa.me/${cleaned}?text=${encoded}`
  }

  function openWhatsApp(phone: string, message: string) {
    window.open(buildWhatsAppLink(phone, message), '_blank')
  }

  function openAllWhatsApp(cands: Candidate[], message: string) {
    cands.forEach((c, i) => {
      if (c.phone) {
        setTimeout(() => {
          window.open(buildWhatsAppLink(c.phone!, message), '_blank')
        }, i * 800)
      }
    })
  }

  const levelLabel: Record<string, string> = {
    beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui', color: '#fff' }}>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800' }}>Notifiche WhatsApp</div>
        <div style={{ fontSize: '13px', color: '#5a5a6a', marginTop: '4px' }}>
          Avvisa gli alunni di posti liberi o invia messaggi manuali
        </div>
      </div>

      {/* POSTI LIBERI */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔔 Posti liberati (ultime 48h)
          <span style={{ fontSize: '12px', background: cancellations.length > 0 ? 'rgba(232,88,88,0.15)' : 'rgba(255,255,255,0.06)', color: cancellations.length > 0 ? '#e85858' : '#8b93a8', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>
            {cancellations.length}
          </span>
        </div>

        {cancellations.length === 0 ? (
          <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '32px 20px', textAlign: 'center', color: '#5a5a6a', fontSize: '14px' }}>
            ✅ Nessuna cancellazione recente
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {cancellations.map(canc => {
              const cands = candidates[canc.booking_id] ?? []
              const message = `Ciao! Si è liberato un posto per *${canc.lesson_title}*\n📅 ${canc.lesson_date} alle ${canc.lesson_time}\n📍 ${canc.court}\n\nVuoi prenotare? Rispondimi qui! 🎾`

              return (
                <div key={canc.booking_id} style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{canc.lesson_title}</div>
                      <div style={{ fontSize: '12px', color: '#8b93a8' }}>
                        📅 {canc.lesson_date} · 🕐 {canc.lesson_time} · 📍 {canc.court}
                      </div>
                      <div style={{ fontSize: '12px', color: '#5a5a6a', marginTop: '3px' }}>
                        Cancellato da: {canc.student_name}
                      </div>
                    </div>
                    <span style={{ background: 'rgba(232,88,88,0.1)', color: '#e85858', border: '1px solid rgba(232,88,88,0.2)', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      1 posto libero
                    </span>
                  </div>

                  <div style={{ background: '#1e2535', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', fontSize: '13px', color: '#8b93a8', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                    {message}
                  </div>

                  {cands.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#5a5a6a', textAlign: 'center', padding: '8px' }}>
                      Nessun alunno disponibile con numero di telefono
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                        Alunni compatibili ({levelLabel[canc.level]}) — {cands.length} con telefono
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {cands.map(cand => (
                          <div key={cand.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1e2535', borderRadius: '10px', padding: '10px 14px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: '600' }}>{cand.first_name} {cand.last_name}</div>
                              <div style={{ fontSize: '12px', color: '#5a5a6a' }}>{cand.phone}</div>
                            </div>
                            <button
                              onClick={() => openWhatsApp(cand.phone!, message)}
                              style={{ background: '#25D366', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              📱 WhatsApp
                            </button>
                          </div>
                        ))}
                      </div>
                      {cands.length > 1 && (
                        <button
                          onClick={() => openAllWhatsApp(cands, message)}
                          style={{ width: '100%', background: '#25D366', border: 'none', color: '#fff', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                          📱 Manda WhatsApp a tutti ({cands.length})
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MESSAGGIO MANUALE */}
      <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>📢 Messaggio manuale</div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Destinatari</label>
          <select
            value={manualForm.target}
            onChange={async e => {
              const val = e.target.value
              setManualForm(f => ({ ...f, target: val }))
              await loadManualCandidates(val)
            }}
            style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}>
            <option value="all">Tutti gli alunni</option>
            <option value="beginner">Solo Principianti</option>
            <option value="intermediate">Solo Intermedi</option>
            <option value="advanced">Solo Avanzati</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Messaggio</label>
          <textarea
            value={manualForm.message}
            onChange={e => setManualForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Es: Lezione di sabato spostata alle 11:00 ⚠️"
            rows={4}
            style={{ width: '100%', padding: '11px 12px', background: '#1e2535', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'system-ui' }}
          />
        </div>

        {manualForm.message.trim() && manualCandidates.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#8b93a8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              {manualCandidates.length} alunni con telefono
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
              {manualCandidates.map(cand => (
                <div key={cand.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1e2535', borderRadius: '8px', padding: '8px 12px' }}>
                  <div style={{ flex: 1, fontSize: '13px' }}>
                    {cand.first_name} {cand.last_name} · <span style={{ color: '#5a5a6a' }}>{cand.phone}</span>
                  </div>
                  <button
                    onClick={() => openWhatsApp(cand.phone!, manualForm.message)}
                    style={{ background: '#25D366', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    📱
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (!manualForm.message.trim()) return
            if (manualCandidates.length === 0) {
              loadManualCandidates(manualForm.target)
              return
            }
            openAllWhatsApp(manualCandidates, manualForm.message)
          }}
          disabled={!manualForm.message.trim()}
          style={{ width: '100%', background: manualForm.message.trim() ? '#25D366' : '#1e2535', border: 'none', color: manualForm.message.trim() ? '#fff' : '#5a5a6a', padding: '13px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: manualForm.message.trim() ? 'pointer' : 'not-allowed' }}>
          📱 Apri WhatsApp per tutti
        </button>
      </div>

    </div>
  )
}