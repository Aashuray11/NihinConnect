import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'

type User = { id: number; name: string; email: string; avatar?: string }

type AuthContextValue = {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  login: (access: string, refresh: string) => Promise<void>
  logout: () => void
  setUser: (u: User | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('nihiconnect_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('nihiconnect_access'))
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem('nihiconnect_refresh'))

  useEffect(()=>{
    // initialize axios auth header
    api.setAuthToken(accessToken)
  },[accessToken])

  const login = async (access:string, refresh:string) => {
    setAccessToken(access)
    setRefreshToken(refresh)
    localStorage.setItem('nihiconnect_access', access)
    localStorage.setItem('nihiconnect_refresh', refresh)
    api.setAuthToken(access)
    // fetch profile
    try{
      const resp = await api.get('/auth/profile/')
      setUser(resp.data)
      localStorage.setItem('nihiconnect_user', JSON.stringify(resp.data))
    }catch(err){
      console.error('fetch profile failed', err)
    }
  }

  const logout = () => {
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    localStorage.removeItem('nihiconnect_access')
    localStorage.removeItem('nihiconnect_refresh')
    localStorage.removeItem('nihiconnect_user')
    api.setAuthToken(null)
  }

  return (
    <AuthContext.Provider value={{user, accessToken, refreshToken, login, logout, setUser}}>
      {children}
    </AuthContext.Provider>
  )
}
