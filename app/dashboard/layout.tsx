'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { ClubProvider, useClub, useTheme } from './club-context'

interface Club {
  id: string
  name: string
  role: string
  plan: string
  primary_color: string
  logo_url: string | null
  theme: string
  plan_expires_at: string | null
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const [userEmail, setUserEmail] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [clubMenuOpen, setClubMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { clubs, activeClub, setActiveClub } = useClub()
  const { isDark, pc, bg, surface, surface2, border, text, textSub, textMuted } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768) }
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
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'super_admin') setIsSuperAdmin(true)
    }
    load()
  }, [])

  function switchClub(club: Club) {
    setActiveClub(club)
    setClubMenuOpen(false)
    router.refresh()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function navigate(path: string) {
    router.push(path)
    setMenuOpen(false)
  }

  // Calcola giorni alla scadenza
  function daysToExpiry(): number | null {
    if (!activeClub?.plan_expires_at || activeClub.plan === 'free') return null
    return Math.ceil((new Date(activeClub.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  const expiryDays = daysToExpiry()
  const isExpired  = expiryDays !== null && expiryDays < 0
  const isExpiring = expiryDays !== null && expiryDays >= 0 && expiryDays <= 7

  const navItems = [
    { label: 'Dashboard',    icon: '▦',  path: '/dashboard' },
    { label: 'Lezioni',      icon: '📅', path: '/dashboard/lezioni' },
    { label: 'Alunni',       icon: '👥', path: '/dashboard/alunni' },
    { label: 'Notifiche',    icon: '🔔', path: '/dashboard/notifiche' },
    { label: 'Analytics',    icon: '📊', path: '/dashboard/analytics' },
    { label: 'Inviti',       icon: '🔗', path: '/dashboard/inviti' },
    { label: 'Abbonamento',  icon: '💳', path: '/dashboard/abbonamento' },
    { label: 'Personalizza', icon: '🎨', path: '/dashboard/personalizzazione' },
    { label: 'Centri',       icon: '🏟️', path: '/dashboard/centri' },
  ]

  const planColor: Record<string, string> = {
    free:    textMuted,
    starter: '#5b7fff',
    pro:     pc
  }

  const SidebarInner = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: surface }}>

      {/* Logo */}
      <div style={{ padding: '24px 20px 16px', borderBottom: `1px solid ${border}` }}>
        {activeClub?.logo_url ? (
          <img src={activeClub.logo_url} alt="Logo" style={{ maxHeight: '36px', maxWidth: '140px', objectFit: 'contain' }} />
        ) : (
          <div style={{ fontSize: '20px', fontWeight: '800', color: pc }}>
            {activeClub?.name ?? 'remate'}●
          </div>
        )}
      </div>

      {/* Selettore centro */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, position: 'relative' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
          Centro attivo
        </div>
        <div onClick={() => setClubMenuOpen(!clubMenuOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 10px', cursor: clubs.length > 1 ? 'pointer' : 'default' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: `${pc}18`, border: `1px solid ${pc}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: pc, flexShrink: 0 }}>
            {activeClub?.name.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeClub?.name ?? 'Nessun centro'}
            </div>
            <div style={{ fontSize: '10px', color: planColor[activeClub?.plan ?? 'free'], fontWeight: '600' }}>
              Piano {activeClub?.plan ?? 'free'}
            </div>
          </div>
          {clubs.length > 1 && <div style={{ fontSize: '12px', color: textMuted }}>⌄</div>}
        </div>

        {/* Dropdown centri */}
        {clubMenuOpen && clubs.length > 1 && (
          <div style={{ position: 'absolute', top: '100%', left: '16px', right: '16px', background: surface2, border: `1px solid ${border}`, borderRadius: '10px', zIndex: 100, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            {clubs.map(club => (
              <div key={club.id} onClick={() => switchClub(club as Club)}
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: activeClub?.id === club.id ? `${pc}10` : 'transparent', borderBottom: `1px solid ${border}` }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${pc}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: pc }}>
                  {club.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: text, fontWeight: activeClub?.id === club.id ? '700' : '400' }}>{club.name}</div>
                  <div style={{ fontSize: '10px', color: planColor[club.plan] ?? textMuted, fontWeight: '600' }}>Piano {club.plan}</div>
                </div>
                {activeClub?.id === club.id && <div style={{ color: pc, fontSize: '12px' }}>✓</div>}
              </div>
            ))}
            <div onClick={() => { setClubMenuOpen(false); navigate('/dashboard/centri') }}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: pc, fontWeight: '600', textAlign: 'center' }}>
              + Aggiungi centro
            </div>
          </div>
        )}
      </div>

      {/* Banner scadenza piano */}
      {isExpired && (
        <div style={{ margin: '10px 12px', background: 'rgba(232,88,88,0.1)', border: '1px solid rgba(232,88,88,0.3)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#e85858', marginBottom: '4px' }}>⚠️ Piano scaduto</div>
          <div style={{ fontSize: '11px', color: textSub, marginBottom: '6px' }}>Il tuo piano {activeClub?.plan} è scaduto</div>
          <div style={{ fontSize: '11px', color: '#e85858', fontWeight: '600', cursor: 'pointer' }}
            onClick={() => navigate('/dashboard/abbonamento')}>
            Rinnova ora →
          </div>
        </div>
      )}

      {isExpiring && !isExpired && (
        <div style={{ margin: '10px 12px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#f5a623', marginBottom: '4px' }}>⏳ Piano in scadenza</div>
          <div style={{ fontSize: '11px', color: textSub, marginBottom: '6px' }}>Scade tra {expiryDays} giorni</div>
          <div style={{ fontSize: '11px', color: '#f5a623', fontWeight: '600', cursor: 'pointer' }}
            onClick={() => navigate('/dashboard/abbonamento')}>
            Rinnova →
          </div>
        </div>
      )}

      {/* Banner upgrade free */}
      {activeClub?.plan === 'free' && !isSuperAdmin && !isExpired && (
        <div style={{ margin: '10px 12px', background: 'rgba(91,127,255,0.08)', border: '1px solid rgba(91,127,255,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#5b7fff', marginBottom: '4px' }}>Piano Free</div>
          <div style={{ fontSize: '11px', color: textSub, marginBottom: '6px' }}>1 centro · max 20 alunni</div>
          <div style={{ fontSize: '11px', color: '#5b7fff', fontWeight: '600', cursor: 'pointer' }}
            onClick={() => navigate('/dashboard/abbonamento')}>
            Passa a Starter →
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 0' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: textMuted, textTransform: 'uppercase', letterSpacing: '1.2px', padding: '0 20px', marginBottom: '8px' }}>Menu</div>
        {navItems.map(item => {
          const isActive = pathname === item.path
          return (
            <div key={item.path} onClick={() => navigate(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '10px', margin: '2px 8px', cursor: 'pointer', background: isActive ? `${pc}15` : 'transparent', color: isActive ? pc : textSub, fontWeight: isActive ? '700' : '400', fontSize: '14px' }}>
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          )
        })}

        {isSuperAdmin && (
          <div onClick={() => navigate('/superadmin')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '10px', margin: '8px 8px 2px', cursor: 'pointer', background: 'rgba(245,166,35,0.08)', color: '#f5a623', fontSize: '14px', fontWeight: '600' }}>
            <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>⚙️</span>
            Pannello Admin
          </div>
        )}
      </div>

      {/* User */}
      <div style={{ padding: '16px', borderTop: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `linear-gradient(135deg, #3a7fd4, ${pc})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', color: text, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
            <div onClick={handleLogout} style={{ fontSize: '11px', color: textMuted, cursor: 'pointer', marginTop: '2px' }}>Esci →</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: bg, fontFamily: 'system-ui', color: text }}>

      {!isMobile && (
        <div style={{ width: '220px', minWidth: '220px', background: surface, borderRight: `1px solid ${border}`, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, overflowY: 'auto' }}>
          <SidebarInner />
        </div>
      )}

      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', background: surface, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 50 }}>
          {activeClub?.logo_url ? (
            <img src={activeClub.logo_url} alt="Logo" style={{ maxHeight: '28px', maxWidth: '100px', objectFit: 'contain' }} />
          ) : (
            <div style={{ fontSize: '18px', fontWeight: '800', color: pc }}>
              {activeClub?.name ?? 'remate'}●
            </div>
          )}
          <div style={{ fontSize: '13px', color: textSub, flex: 1, textAlign: 'center' }}>{activeClub?.name}</div>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: 'none', color: text, width: '38px', height: '38px', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      )}

      {isMobile && menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', background: surface, borderRight: `1px solid ${border}`, zIndex: 70, overflowY: 'auto' }}>
            <SidebarInner />
          </div>
        </>
      )}

      <div style={{ marginLeft: isMobile ? 0 : '220px', marginTop: isMobile ? '56px' : 0, flex: 1, minHeight: isMobile ? 'calc(100vh - 56px)' : '100vh', width: isMobile ? '100%' : 'calc(100% - 220px)' }}>
        {children}
      </div>

    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClubProvider>
      <DashboardInner>{children}</DashboardInner>
    </ClubProvider>
  )
}