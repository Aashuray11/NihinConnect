import React from 'react'
import AppRouter from './routes/AppRouter'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import { useAuth } from './context/AuthContext'
import { useLocation } from 'react-router-dom'

export default function App(){
  const { user } = useAuth()
  const location = useLocation()

  // routes where we should not show the NavBar even if logged in
  const hideOn = ['/login', '/register', '/otp-verify']
  const showNav = Boolean(user) && !hideOn.includes(location.pathname)
  // routes where we should not show the Footer (login/register/otp pages)
  const hideFooter = ['/login', '/register', '/otp-verify']
  const showFooter = !hideFooter.includes(location.pathname)

  return (
    <div className="min-h-screen bg-gray-50">
      {showNav && <NavBar />}
      {/* spacer to offset fixed navbar height so page titles aren't hidden */}
      {showNav && <div className="h-16" />}
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        <div className="flex-1">
          <AppRouter />
        </div>
        {showFooter && <Footer />}
      </div>
    </div>
  )
}
