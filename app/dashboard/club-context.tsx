'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Club {
  id: string
  name: string
  role: string
}

interface ClubContextType {
  activeClub: Club | null
  clubs: Club[]
  setActiveClub: (club: Club) => void
}

const ClubContext = createContext<ClubContextType>({
  activeClub: null,
  clubs: [],
  setActiveClub: () => {}
})

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const [clubs, setClubs] = useState<Club[]>([])
  const [activeClub, setActiveClubState] = useState<Club | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: ic } = await supabase
        .from('instructor_clubs')
        .select('role, clubs(id, name)')
        .eq('profile_id', user.id)

      if (ic && ic.length > 0) {
        const clubList = ic.map((c: any) => ({
          id:   c.clubs.id,
          name: c.clubs.name,
          role: c.role
        }))
        setClubs(clubList)

        const savedId = localStorage.getItem('activeClubId')
        const saved   = clubList.find(c => c.id === savedId)
        setActiveClubState(saved ?? clubList[0])
      }
    }
    load()
  }, [])

  function setActiveClub(club: Club) {
    setActiveClubState(club)
    localStorage.setItem('activeClubId', club.id)
  }

  return (
    <ClubContext.Provider value={{ activeClub, clubs, setActiveClub }}>
      {children}
    </ClubContext.Provider>
  )
}

export function useClub() {
  return useContext(ClubContext)
}