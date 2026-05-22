'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Club {
  id: string
  name: string
  role: string
  plan: string
  primary_color: string
  logo_url: string | null
  theme: string
}

interface ClubContextType {
  activeClub: Club | null
  clubs: Club[]
  setActiveClub: (club: Club) => void
  refreshClub: () => void
}

const ClubContext = createContext<ClubContextType>({
  activeClub: null,
  clubs: [],
  setActiveClub: () => {},
  refreshClub: () => {}
})

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const [clubs, setClubs] = useState<Club[]>([])
  const [activeClub, setActiveClubState] = useState<Club | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: ic } = await supabase
      .from('instructor_clubs')
      .select('role, clubs(id, name, plan, primary_color, logo_url, theme)')
      .eq('profile_id', user.id)

    if (ic && ic.length > 0) {
      const clubList = ic.map((c: any) => ({
        id:            c.clubs.id,
        name:          c.clubs.name,
        role:          c.role,
        plan:          c.clubs.plan,
        primary_color: c.clubs.primary_color ?? '#c8f53a',
        logo_url:      c.clubs.logo_url ?? null,
        theme:         c.clubs.theme ?? 'dark'
      }))
      setClubs(clubList)

      const savedId = localStorage.getItem('activeClubId')
      const saved   = clubList.find((c: Club) => c.id === savedId)
      const active  = saved ?? clubList[0]
      setActiveClubState(active)

      // Salva tema e colore nel localStorage per applicazione immediata
      localStorage.setItem('clubTheme', active.theme)
      localStorage.setItem('clubColor', active.primary_color)
    }
  }

  function setActiveClub(club: Club) {
    setActiveClubState(club)
    localStorage.setItem('activeClubId', club.id)
    localStorage.setItem('clubTheme', club.theme)
    localStorage.setItem('clubColor', club.primary_color)
  }

  function refreshClub() { load() }

  return (
    <ClubContext.Provider value={{ activeClub, clubs, setActiveClub, refreshClub }}>
      {children}
    </ClubContext.Provider>
  )
}

export function useClub() {
  return useContext(ClubContext)
}

export function useTheme() {
  const { activeClub } = useContext(ClubContext)

  // Leggi dal localStorage per applicazione immediata (evita flash)
  const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('clubTheme') : null
  const storedColor = typeof window !== 'undefined' ? localStorage.getItem('clubColor') : null

  const isDark = (activeClub?.theme ?? storedTheme ?? 'dark') === 'dark'
  const pc     = activeClub?.primary_color ?? storedColor ?? '#c8f53a'

  return {
    isDark,
    pc,
    bg:        isDark ? '#0e1117'                : '#f0ede8',
    surface:   isDark ? '#161b27'                : '#ffffff',
    surface2:  isDark ? '#1e2535'                : '#ebe8e0',
    border:    isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text:      isDark ? '#ffffff'                : '#0e1117',
    textSub:   isDark ? 'rgba(255,255,255,0.5)'  : 'rgba(0,0,0,0.5)',
    textMuted: isDark ? '#5a5a6a'                : '#8a8a9a',
    cardBorder:isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
  }
}