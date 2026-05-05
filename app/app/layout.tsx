'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', user.id)
        .single()

      // Se è admin reindirizza alla dashboard
      if (profile?.role === 'club_admin' || profile?.role === 'super_admin') {
        router.push('/dashboard')
        return
      }

      setUser({ ...user, ...profile })
    }
    check()
  }, [])

  const navItems = [
    { label: 'Home',      icon: '🏠', path: '/app' },
    { label: 'Lezioni',   icon: '📅', path: '/app/lezioni' },
    { label: 'Le mie',    icon: '🎾', path: '/app/mie-lezioni' },
    { label: 'Profilo',   icon: '👤', path: '/app/profilo' },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: '#0e1117',
      fontFamily: 'system-ui', color: '#fff',
      paddingBottom: '70px', maxWidth: '480px',
      margin: '0 auto', position: 'relative'
    }}>
      {/* Contenuto */}
      {children}

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: '#161b27',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-around',
        padding: '10px 0 16px', zIndex: 50
      }}>
        {navItems.map(item => {
          const isActive = pathname === item.path
          return (
            <div key={item.path} onClick={() => router.push(item.path)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', padding: '4px 16px', borderRadius: '10px', minWidth: '60px' }}>
              <div style={{ fontSize: '22px' }}>{item.icon}</div>
              <div style={{ fontSize: '10px', fontWeight: isActive ? '700' : '400', color: isActive ? '#c8f53a' : 'rgba(255,255,255,0.35)' }}>
                {item.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}