'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [clubName, setClubName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  function navigate(path: string) {
    router.push(path)
    setMenuOpen(false)
  }

  const navItems = [
    { label: 'Dashboard',  icon: '▦',  path: '/dashboard' },
    { label: 'Lezioni',    icon: '📅', path: '/dashboard/lezioni' },
    { label: 'Alunni',     icon: '👥', path: '/dashboard/alunni' },
    { label: 'Notifiche',  icon: '🔔', path: '/dashboard/notifiche' },
    { label: 'Analytics',  icon: '📊', path: '/dashboard/analytics' },
  ]

  const NavItems = () => (
    <>
      {navItems.map(item => {
        const isActive = pathname === item.path
        return (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '13px 16px', borderRadius: '10px', margin: '2px 8px',
              cursor: 'pointer',
              background: isActive ? 'rgba(200,245,58,0.12)' : 'transparent',
              color: isActive ? '#c8f53a' : 'rgba(255,255,255,0.5)',
              fontWeight: isActive ? '700' : '400',
              fontSize: '14px',
            }}
          >
            <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </div>
        )
      })}
    </>
  )

  const SidebarInner = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#c8f53a' }}>padel●</div>
      </div>

      {/* Club */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(200,245,58,0.15)', border: '1px solid rgba(200,245,58,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#c8f53a', flexShrink: 0 }}>
          {clubName.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{clubName || 'Il tuo club'}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Piano Free</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 0' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '0 20px', marginBottom: '8px' }}>Menu</div>
        <NavItems />
      </div>

      {/* User */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #3a7fd4, #c8f53a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#1a1a14', flexShrink: 0 }}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', color: '#fff', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
            <div onClick={handleLogout} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', marginTop: '2px' }}>Esci →</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0e1117', fontFamily: 'system-ui', color: '#fff' }}>

      {/* SIDEBAR — solo desktop */}
      {!isMobile && (
        <div style={{
          width: '220px', minWidth: '220px',
          background: '#161b27',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 50, overflowY: 'auto'
        }}>
          <SidebarInner />
        </div>
      )}

      {/* TOPBAR — solo mobile */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: '56px', background: '#161b27',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px', zIndex: 50
        }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#c8f53a' }}>padel●</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{clubName}</div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', width: '38px', height: '38px', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      )}

      {/* DRAWER — mobile menu aperto */}
      {isMobile && menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60 }}
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '280px', background: '#161b27',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            zIndex: 70, overflowY: 'auto'
          }}>
            <SidebarInner />
          </div>
        </>
      )}

      {/* CONTENUTO PRINCIPALE */}
      <div style={{
        marginLeft: isMobile ? 0 : '220px',
        marginTop: isMobile ? '56px' : 0,
        flex: 1,
        minHeight: isMobile ? 'calc(100vh - 56px)' : '100vh',
        width: isMobile ? '100%' : 'calc(100% - 220px)'
      }}>
        {children}
      </div>

    </div>
  )
}