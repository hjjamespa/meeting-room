'use client'

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { auth } from '@/lib/api'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
}

interface UserContextType {
  user: UserProfile | null
  loading: boolean
  refresh: () => void
}

const UserContext = createContext<UserContextType>({ user: null, loading: true, refresh: () => {} })

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const lastUserIdRef = useRef<string | null>(null)

  const loadProfile = async () => {
    try {
      const { user: authUser, profile } = await auth.getUser()
      if (!authUser) {
        lastUserIdRef.current = null
        setUser(null)
        setLoading(false)
        return
      }
      if (lastUserIdRef.current === authUser.id) {
        setLoading(false)
        return
      }
      lastUserIdRef.current = authUser.id
      if (profile) {
        setUser(profile as UserProfile)
      } else {
        setUser({
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email || 'User',
          email: authUser.email || '',
          role: 'viewer',
        })
      }
    } catch {
      lastUserIdRef.current = null
      setUser(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const refresh = () => {
    lastUserIdRef.current = null
    setLoading(true)
    void loadProfile()
  }

  return (
    <UserContext.Provider value={{ user, loading, refresh }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
