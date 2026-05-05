'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [clubName, setClubName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('club_id, clubs(name)')
        .eq('id', user.id)
        .single()

      if (profile?.clubs) {
        setClubName((profile.clubs as any).name)
      }
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { label: 'Dashboard',  icon: '▦',  path: '/dashboard' },
    { label: 'Lezioni',    icon: '📅', path: '/dashboard/lezioni' },
    { label: 'Alunni',     icon: '👥', path: '/dashboard/alunni' },
    { label: 'Notifiche',  icon: '🔔', path: '/dashboard/notifiche' },
    { label: 'Analytics',  icon: '📊', path: '/dashboard/analytics' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0e1117', fontFamily: 'system-ui', color: '#fff' }}>

      {/* SIDEBAR */}
      <div style={{
        width: '220px', minWidth: '220px',
        background: '#161b27',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 50
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#c8f53a', letterSpacing: '-0.5px' }}>padel●</div>
        </div>

        {/* Club */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(200,245,58,0.15)', border: '1px solid rgba(200,245,58,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#c8f53a' }}>
            {clubName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{clubName || 'Il tuo club'}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Piano Free</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: '12px 8px', flex: 1 }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '0 12px', marginBottom: '6px' }}>Menu</div>
          {navItems.map(item => {
            const isActive = pathname === item.path
            return (
              <div
                key={item.path}
                onClick={() => router.push(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '8px', margin: '1px 0',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: isActive ? 'rgba(200,245,58,0.12)' : 'transparent',
                  color: isActive ? '#c8f53a' : 'rgba(255,255,255,0.45)',
                  fontWeight: isActive ? '600' : '400',
                  fontSize: '13px'
                }}
              >
                <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </div>
            )
          })}
        </div>

        {/* User */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #3a7fd4, #c8f53a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#1a1a14', flexShrink: 0 }}>
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', color: '#fff', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
              <div
                onClick={handleLogout}
                style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', marginTop: '2px' }}
              >
                Esci →
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: '220px', flex: 1, minHeight: '100vh' }}>
        {children}
      </div>

    </div>
  )
}