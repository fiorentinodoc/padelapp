'use client'
import { ClubProvider, useClub } from './club-context'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

interface Club {
  id: string
  name: string
  role: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { clubs, activeClub, setActiveClub } = useClub()
  const [userEmail, setUserEmail] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [clubMenuOpen, setClubMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
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

      // Carica tutti i centri dell'istruttore
      const { data: instructorClubs } = await supabase
        .from('instructor_clubs')
        .select('role, clubs(id, name)')
        .eq('profile_id', user.id)

      if (instructorClubs && instructorClubs.length > 0) {
        const clubList = instructorClubs.map((ic: any) => ({
          id:   ic.clubs.id,
          name: ic.clubs.name,
          role: ic.role
        }))
        setClubs(clubList)

        // Leggi il centro attivo dal localStorage o usa il primo
        const savedClubId = localStorage.getItem('activeClubId')
        const saved = clubList.find(c => c.id === savedClubId)
        setActiveClub(saved ?? clubList[0])
      }
    }
    load()
  }, [])

  function switchClub(club: Club) {
    setActiveClub(club)
    localStorage.setItem('activeClubId', club.id)
    setClubMenuOpen(false)
    // Ricarica la pagina corrente per aggiornare i dati
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

  const navItems = [
    { label: 'Dashboard',  icon: '▦',  path: '/dashboard' },
    { label: 'Lezioni',    icon: '📅', path: '/dashboard/lezioni' },
    { label: 'Alunni',     icon: '👥', path: '/dashboard/alunni' },
    { label: 'Notifiche',  icon: '🔔', path: '/dashboard/notifiche' },
    { label: 'Analytics',  icon: '📊', path: '/dashboard/analytics' },
    { label: 'Centri',     icon: '🏟️', path: '/dashboard/centri' },
  ]

  const SidebarInner = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#c8f53a' }}>padel●</div>
      </div>

      {/* Selettore centro */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
          Centro attivo
        </div>
        <div
          onClick={() => setClubMenuOpen(!clubMenuOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 10px', cursor: clubs.length > 1 ? 'pointer' : 'default' }}
        >
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(200,245,58,0.15)', border: '1px solid rgba(200,245,58,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#c8f53a', flexShrink: 0 }}>
            {activeClub?.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeClub?.name ?? 'Nessun centro'}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
              {activeClub?.role === 'owner' ? 'Proprietario' : 'Manager'}
            </div>
          </div>
          {clubs.length > 1 && (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>⌄</div>
          )}
        </div>

        {/* Dropdown centri */}
        {clubMenuOpen && clubs.length > 1 && (
          <div style={{ position: 'absolute', top: '100%', left: '16px', right: '16px', background: '#1e2535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', zIndex: 100, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            {clubs.map(club => (
              <div key={club.id} onClick={() => switchClub(club)}
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: activeClub?.id === club.id ? 'rgba(200,245,58,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(200,245,58,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#c8f53a' }}>
                  {club.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#fff', fontWeight: activeClub?.id === club.id ? '700' : '400' }}>{club.name}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{club.role === 'owner' ? 'Proprietario' : 'Manager'}</div>
                </div>
                {activeClub?.id === club.id && <div style={{ color: '#c8f53a', fontSize: '12px' }}>✓</div>}
              </div>
            ))}
            <div onClick={() => { setClubMenuOpen(false); navigate('/dashboard/centri') }}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: '#c8f53a', fontWeight: '600', textAlign: 'center' }}>
              + Aggiungi centro
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 0' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '0 20px', marginBottom: '8px' }}>Menu</div>
        {navItems.map(item => {
          const isActive = pathname === item.path
          return (
            <div key={item.path} onClick={() => navigate(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '10px', margin: '2px 8px', cursor: 'pointer', background: isActive ? 'rgba(200,245,58,0.12)' : 'transparent', color: isActive ? '#c8f53a' : 'rgba(255,255,255,0.5)', fontWeight: isActive ? '700' : '400', fontSize: '14px' }}>
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          )
        })}
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
  <ClubProvider>
  <div style={{ display: 'flex', minHeight: '100vh', background: '#0e1117', fontFamily: 'system-ui', color: '#fff' }}>

      {/* SIDEBAR DESKTOP */}
      {!isMobile && (
        <div style={{ width: '220px', minWidth: '220px', background: '#161b27', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, overflowY: 'auto' }}>
          <SidebarInner />
        </div>
      )}

      {/* TOPBAR MOBILE */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', background: '#161b27', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 50 }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#c8f53a' }}>padel●</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', flex: 1, textAlign: 'center' }}>{activeClub?.name}</div>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', width: '38px', height: '38px', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      )}

      {/* DRAWER MOBILE */}
      {isMobile && menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', background: '#161b27', borderRight: '1px solid rgba(255,255,255,0.06)', zIndex: 70, overflowY: 'auto' }}>
            <SidebarInner />
          </div>
        </>
      )}

 {/* CONTENUTO */}
      <div style={{ marginLeft: isMobile ? 0 : '220px', marginTop: isMobile ? '56px' : 0, flex: 1, minHeight: isMobile ? 'calc(100vh - 56px)' : '100vh', width: isMobile ? '100%' : 'calc(100% - 220px)' }}>
        {children}
      </div>

    </div>
  </ClubProvider>
  )
}