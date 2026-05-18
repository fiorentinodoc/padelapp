'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function JoinPage() {
  const [club, setClub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const code = params.code as string

  useEffect(() => { loadCode() }, [])

  async function loadCode() {
    // Verifica il codice
    const { data: joinCode } = await supabase
      .from('join_codes')
      .select('*, clubs(id, name)')
      .eq('code', code)
      .eq('active', true)
      .single()

    if (!joinCode) {
      setError('Link non valido o scaduto')
      setLoading(false)
      return
    }

    setClub(joinCode.clubs)

    // Controlla se l'utente è già loggato
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // È già loggato — collegalo al club
      await joinClub(user.id, joinCode)
    }

    setLoading(false)
  }

  async function joinClub(userId: string, joinCode: any) {
    // Trova lo student record
    const { data: student } = await supabase
      .from('students')
      .select('id, club_id')
      .eq('profile_id', userId)
      .single()

    if (student) {
      // Aggiungi alla tabella student_clubs se non già presente
      await supabase
        .from('student_clubs')
        .upsert({
          student_id: student.id,
          club_id:    joinCode.club_id
        }, { onConflict: 'student_id,club_id' })

      // Aggiorna club_id principale se non ne ha uno
      if (!student.club_id) {
        await supabase
          .from('students')
          .update({ club_id: joinCode.club_id })
          .eq('id', student.id)
      }
    }

    // Incrementa uses
    await supabase
      .from('join_codes')
      .update({ uses: joinCode.uses + 1 })
      .eq('id', joinCode.id)

    router.push('/player')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8f53a', fontFamily: 'system-ui' }}>
      Caricamento...
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: '20px' }}>
      <div style={{ background: '#161b27', border: '1px solid rgba(232,88,88,0.2)', borderRadius: '20px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>Link non valido</div>
        <div style={{ fontSize: '14px', color: '#8b93a8', marginBottom: '24px' }}>{error}</div>
        <button onClick={() => router.push('/login')}
          style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          Vai al login
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: '20px' }}>
      <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#c8f53a', marginBottom: '20px' }}>padel●</div>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎾</div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
          Sei stato invitato!
        </div>
        <div style={{ fontSize: '15px', color: '#8b93a8', marginBottom: '6px' }}>Unisciti a</div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: '#c8f53a', marginBottom: '28px' }}>
          {club?.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => router.push(`/login?mode=register&code=${code}`)}
            style={{ background: '#c8f53a', border: 'none', color: '#0e1117', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
            Crea account e unisciti →
          </button>
          <button
            onClick={() => router.push(`/login?code=${code}`)}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b93a8', padding: '14px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
            Ho già un account — Accedi
          </button>
        </div>
      </div>
    </div>
  )
}