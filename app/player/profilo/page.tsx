'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ProfiloPage() {
  const [profile, setProfile] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [stats, setStats] = useState({ total: 0, confirmed: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()
    setProfile({ ...prof, email: user.email })

    const { data: studentData } = await supabase
      .from('students')
      .select('id, level, group_name, status, joined_at')
      .eq('profile_id', user.id)
      .single()
    setStudent(studentData)

    if (studentData) {
      const { count: total }     = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('student_id', studentData.id)
      const { count: confirmed } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('student_id', studentData.id).eq('status', 'confirmed')
      const { count: cancelled } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('student_id', studentData.id).eq('status', 'cancelled')
      setStats({ total: total ?? 0, confirmed: confirmed ?? 0, cancelled: cancelled ?? 0 })
    }

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const levelLabel: Record<string, string> = {
    beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato'
  }
  const levelColor: Record<string, string> = {
    beginner: '#f5a623', intermediate: '#5b7fff', advanced: '#38c97a'
  }

  const presenceRate = stats.total > 0
    ? Math.round((stats.confirmed / stats.total) * 100)
    : 0

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c8f53a' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ padding: '24px 20px' }}>

      {/* Avatar e nome */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #3a7fd4, #c8f53a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '800', color: '#0e1117', marginBottom: '12px' }}>
          {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
        </div>
        <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>
          {profile?.first_name} {profile?.last_name}
        </div>
        <div style={{ fontSize: '13px', color: '#5a5a6a' }}>{profile?.email}</div>
        {student?.level && (
          <span style={{ marginTop: '8px', background: `${levelColor[student.level]}18`, color: levelColor[student.level], border: `1px solid ${levelColor[student.level]}40`, padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
            {levelLabel[student.level]}
            {student.group_name && ` · ${student.group_name}`}
          </span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'Lezioni',     value: stats.total,     color: '#c8f53a' },
          { label: 'Presenze',    value: `${presenceRate}%`, color: '#38c97a' },
          { label: 'Cancellate',  value: stats.cancelled, color: '#e85858' },
        ].map(s => (
          <div key={s.label} style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#5a5a6a', marginTop: '3px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info iscrizione */}
      {student?.joined_at && (
        <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: '#5a5a6a', marginBottom: '4px' }}>Iscritto dal</div>
          <div style={{ fontSize: '15px', fontWeight: '600' }}>
            {new Date(student.joined_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      )}

      {/* Opzioni */}
      <div style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: '14px' }}>🔔 Notifiche push</span>
          <span style={{ fontSize: '12px', color: '#38c97a', fontWeight: '600' }}>Attive</span>
        </div>
        <div onClick={() => router.push('/player/lezioni')}
          style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '14px' }}>📅 Prenota una lezione</span>
          <span style={{ color: '#5a5a6a' }}>›</span>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        style={{ width: '100%', background: 'rgba(232,88,88,0.08)', border: '1px solid rgba(232,88,88,0.2)', borderRadius: '14px', padding: '14px', fontSize: '14px', fontWeight: '700', color: '#e85858', cursor: 'pointer' }}>
        Esci dall'account
      </button>
    </div>
  )
}