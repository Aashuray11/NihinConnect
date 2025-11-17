import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import CreatePost from './CreatePost'
import { api } from '../services/api'
import Logo from '../assets/logo.svg'
import LogoCompact from '../assets/logo-compact.svg'

export default function NavBar(){
  const auth = useAuth()
  const nav = useNavigate()
  const onLogout = () => {
    auth.logout()
    nav('/login')
  }

  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifUnreadCount, setNotifUnreadCount] = useState<number>(0)
  const [messageUnreadCount, setMessageUnreadCount] = useState<number>(0)
  const [notifs, setNotifs] = useState<any[]>([])
  const [viewedProfile, setViewedProfile] = useState<any | null>(null)
  const timer = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mobileRef = useRef<HTMLDivElement | null>(null)
  const notifRef = useRef<HTMLDivElement | null>(null)
  const notifPortalEl = useRef<HTMLDivElement | null>(null)
  const notifRefSmall = useRef<HTMLDivElement | null>(null)
  const notifButtonRef = useRef<HTMLButtonElement | null>(null)
  const [smallPopoverStyle, setSmallPopoverStyle] = useState<React.CSSProperties | null>(null)
  const navRef = useRef<HTMLDivElement | null>(null)
  const location = useLocation()
  // Always show the logged-in user's profile in the navbar. Do not replace it when viewing other profiles.
  const displayUser = auth.user

  useEffect(()=>{
    // create a portal container for large-screen popovers so they're not clipped
    if (typeof document !== 'undefined' && !notifPortalEl.current) {
      notifPortalEl.current = document.createElement('div')
      document.body.appendChild(notifPortalEl.current)
    }
    return ()=>{
      if (notifPortalEl.current) {
        try { document.body.removeChild(notifPortalEl.current) } catch(e){}
        notifPortalEl.current = null
      }
    }
  }, [])

  // compute small-screen popover position under the bell icon
  useEffect(()=>{
    if (!notifOpen) return
    const update = ()=>{
      const btn = notifButtonRef.current
      if (!btn) return setSmallPopoverStyle(null)
      const rect = btn.getBoundingClientRect()
      const padding = 8
      const maxWidth = Math.min(window.innerWidth - padding*2, 384) // cap at 24rem (384px)
      // try to center popover under button
      let left = rect.left + rect.width/2 - maxWidth/2
      if (left < padding) left = padding
      if (left + maxWidth > window.innerWidth - padding) left = window.innerWidth - padding - maxWidth
      const top = rect.bottom + 8
      setSmallPopoverStyle({ position: 'fixed', top: `${top}px`, left: `${left}px`, width: `${maxWidth}px`, zIndex: 60 })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return ()=>{
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      setSmallPopoverStyle(null)
    }
  }, [notifOpen])

  useEffect(()=>{
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        setSearchOpen(false)
      }
      // don't auto-close mobile menu when clicking inside the navbar (includes hamburger)
      if (navRef.current && navRef.current.contains(target)) return
      if (mobileRef.current && !mobileRef.current.contains(target)) {
        setMobileOpen(false)
      }
      // if click outside notif panel, close it
      if (
        !(notifRef.current && notifRef.current.contains(target)) &&
        !(notifRefSmall.current && notifRefSmall.current.contains(target)) &&
        notifButtonRef.current && !notifButtonRef.current.contains(target)
      ){
        setNotifOpen(false)
      }
    }
    document.addEventListener('click', onClick)
    return ()=> document.removeEventListener('click', onClick)
  }, [])

  useEffect(()=>{
    // simple mount log to ensure the updated bundle is loaded
    console.debug('NavBar mounted', { pathname: location.pathname, search: location.search, authUser: auth.user?.id })
    // expose a flag so you can check from console
    try { (window as any).__nihiconnect_navbar = true } catch(e){}
  }, [])

  

  // load profile being viewed (if any) so the header can show that avatar/name
  useEffect(()=>{
    let mounted = true
    const qp = new URLSearchParams(location.search)
    const id = qp.get('id')
    if (location.pathname === '/profile' && id) {
      ;(async ()=>{
        try{
          const res = await api.get(`/auth/profile/?id=${encodeURIComponent(id)}`)
          if (!mounted) return
          setViewedProfile(res.data)
        }catch(err){
          if (mounted) setViewedProfile(null)
        }
      })()
    } else {
      setViewedProfile(null)
    }
    return ()=>{ mounted = false }
  }, [location.pathname, location.search])

  // close mobile menu on navigation
  useEffect(()=>{
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(()=>{
    let mounted = true
    const onNotifsCleared = () => setNotifUnreadCount(0)
    window.addEventListener('nihiconnect.notificationsCleared', onNotifsCleared)
    const fetchNotifs = async ()=>{
      if (!auth.user) return
      try{
        const res = await api.get('/auth/notifications/')
        if (!mounted) return
        setNotifs(res.data.notifications || [])
        setNotifUnreadCount(res.data.unread_count || 0)
      }catch(err){/* ignore */}
    }
    fetchNotifs()
    const id = window.setInterval(fetchNotifs, 30000)
    return ()=>{ mounted = false; window.clearInterval(id); window.removeEventListener('nihiconnect.notificationsCleared', onNotifsCleared) }
  }, [auth.user])

  // fetch unread messages count separately and show on messages link
  useEffect(()=>{
    let mounted = true
    const fetchUnread = async ()=>{
      if (!auth.user) return
      try{
        const res = await api.get('/auth/messages/unread-count/')
        if (!mounted) return
        const c = res.data?.unread_count || 0
        // store message unread count separately from notification unread count
        setMessageUnreadCount(c)
      }catch(err){/* ignore */}
    }
    fetchUnread()
    const id = window.setInterval(fetchUnread, 30000)
    return ()=>{ mounted = false; window.clearInterval(id) }
  }, [auth.user])

  useEffect(()=>{
    if (!q) { setResults([]); setLoading(false); return }
    setLoading(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async ()=>{
      try{
        // fetch users list and filter locally by name/email
        const res = await api.get(`/auth/users/all/`)
        const users = (res.data?.users || []).filter((u:any)=>{
          const low = q.toLowerCase()
          return (u.name || '').toLowerCase().includes(low) || (u.email||'').toLowerCase().includes(low)
        })
        setResults(users)
      }catch(err){
        setResults([])
      }finally{
        setLoading(false)
      }
    }, 350)
  }, [q])

  // handle Enter key to navigate to first result
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter'){
      e.preventDefault()
      if (results && results.length>0){
        const u = results[0]
        setSearchOpen(false)
        nav(`/profile?id=${u.id}`)
      }
    }
  }

  return (
    <div ref={navRef} className="fixed top-0 left-0 right-0 z-50 bg-white shadow p-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/feed" className="flex items-center gap-3">
          <img src={Logo} alt="NihinConnect" className="w-8 h-8 hidden sm:block" />
          <img src={LogoCompact} alt="Nihin" className="w-8 h-8 sm:hidden" />
          <span className="hidden lg:block font-bold text-xl">NihinConnect</span>
        </Link>
        <div className="hidden sm:flex items-center gap-4">
          <Link to="/friends" className="text-sm text-gray-600">Friends</Link>
          <Link to="/messages" className="text-sm text-gray-600 flex items-center gap-2 relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-9 8l-2-2m0 0V5a2 2 0 012-2h14a2 2 0 012 2v14l-4-4H5z"/></svg>
            Messages
            {messageUnreadCount>0 && (
              <span className="absolute -top-2 -right-6 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{messageUnreadCount}</span>
            )}
          </Link>
        </div>
      </div>

      <div className="hidden sm:block flex-1 max-w-xl mx-6" ref={containerRef}>
        <div className="relative">
          <input
            value={q}
            onChange={(e)=>{ setQ(e.target.value); setSearchOpen(true) }}
            onKeyDown={onKeyDown}
            onFocus={()=>setSearchOpen(true)}
            placeholder="Search posts or people"
            className="w-full border rounded-full px-4 py-2 shadow-sm"
          />
          {searchOpen && (q || loading) && (
            <div className="absolute left-0 right-0 mt-2 bg-white border rounded shadow max-h-64 overflow-auto z-50 nih-scroll">
              {loading && <div className="p-3 text-sm text-gray-500">Searching...</div>}
                {!loading && results.length===0 && <div className="p-3 text-sm text-gray-500">No results</div>}
                {!loading && results.map((u:any)=> (
                  <div key={u.id} className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3" onClick={()=>{ setSearchOpen(false); nav(`/profile?id=${u.id}`) }}>
                    <Avatar src={u.avatar} size={36} />
                    <div className="flex-1">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-sm text-gray-600 truncate">{u.email}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={()=>setCreateOpen(true)} title="Create post" className="hidden sm:inline-flex p-2 rounded-full hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
        </button>
        <div className="relative">
          <button ref={notifButtonRef} onClick={async ()=>{
            setNotifOpen(s=>{
              const next = !s
              if(next){
                // closing other overlays so notif doesn't collide
                setMobileOpen(false)
                setCreateOpen(false)
              }
              return next
            })
            console.debug('NavBar: opening notifications', { notifOpen, count: notifs?.length, notifs })
            // if opening, mark all read
            if (!notifOpen){
              try{ await api.post('/auth/notifications/mark-all-read/') }catch(err){}
              setNotifUnreadCount(0)
            }
          }} title="Notifications" className="p-2 rounded-full hover:bg-gray-100 relative">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {notifUnreadCount>0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{notifUnreadCount}</span>
            )}
          </button>
          {notifOpen && (
            <>
              {/* Small screens: bottom sheet style so it doesn't collide */}
              <div ref={notifRefSmall} className="sm:hidden">
                <div style={smallPopoverStyle || undefined} className="bg-white border rounded shadow max-h-[60vh] overflow-auto p-2 nih-scroll">
                  <div className="p-2 border-b font-semibold">Notifications</div>
                  <div className="max-h-[52vh] overflow-auto nih-scroll">
                    {notifs.length===0 && <div className="p-3 text-sm text-gray-500">No notifications</div>}
                    {notifs.map(n=> (
                      <div key={n.id} className="p-3 hover:bg-gray-50">
                        <div className="flex items-center gap-3 min-h-[56px]">
                          <Avatar src={n.actor.avatar} size={36} />
                          <div className="flex-1 overflow-hidden">
                            <div className="text-sm truncate"><strong>{n.actor.name}</strong> {n.verb}</div>
                            <div className="text-xs text-gray-500 truncate">{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Larger screens: anchored popover (rendered into a portal to avoid clipping) */}
              {notifPortalEl.current && notifOpen && createPortal(
                <div ref={notifRef} className="hidden sm:block fixed top-16 right-2 sm:right-0 left-2 sm:left-auto w-[calc(100vw-1rem)] sm:w-[24rem] md:w-[28rem] lg:w-[32rem] max-w-full bg-white border rounded shadow z-60">
                  <div className="p-2 border-b font-semibold">Notifications</div>
                  <div className="max-h-64 overflow-auto nih-scroll">
                    {notifs.length===0 && <div className="p-3 text-sm text-gray-500">No notifications</div>}
                    {notifs.map(n=> (
                      <div key={n.id} className="p-3 hover:bg-gray-50">
                        <div className="flex items-center gap-3 min-h-[56px]">
                          <Avatar src={n.actor.avatar} size={36} />
                          <div className="flex-1 overflow-hidden">
                            <div className="text-sm truncate"><strong>{n.actor.name}</strong> {n.verb}</div>
                            <div className="text-xs text-gray-500 truncate">{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>,
                notifPortalEl.current
              )}
            </>
          )}
        </div>

        {auth.user ? (
          <div className="relative flex items-center gap-2">
            {/* Clicking avatar/name navigates to profile directly */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.debug('NavBar: avatar clicked - navigate to /profile', { authUser: auth.user, displayUser })
                  nav('/profile')
                }}
                className="flex items-center gap-2"
                title="Profile"
              >
                <Avatar src={displayUser?.avatar} size={36} />
                <span className="hidden sm:block">{displayUser?.name}</span>
              </button>

              <button onClick={() => { console.debug('NavBar: logout clicked'); onLogout() }} title="Logout" aria-label="Logout" className="hidden sm:inline-flex p-2 rounded hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>

            {/* profile menu removed - three-dot button and dropdown intentionally omitted */}
          </div>
        ) : (
          <Link to="/login" className="text-sm text-gray-700">Login</Link>
        )}
        {/* hamburger button moved to right corner on small screens */}
        <button
          className="sm:hidden p-2 ml-2 rounded hover:bg-gray-100"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        {/* Create post modal */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
            <div className="absolute inset-0 bg-black opacity-40" onClick={()=>setCreateOpen(false)} />
            <div className="bg-white rounded shadow-lg w-full max-w-2xl mx-4 z-10">
              <div className="flex justify-end p-2">
                <button onClick={()=>setCreateOpen(false)} className="text-gray-600 px-3 py-1">Close</button>
              </div>
              <div className="p-4">
                <CreatePost onCreate={()=>{ setCreateOpen(false); }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div ref={mobileRef} className="sm:hidden absolute top-full left-0 right-0 bg-white border-t shadow z-40">
          <div className="p-3 space-y-3">
            {/* profile header inside mobile hamburger menu */}
            <div className="flex items-center gap-3 p-2 border-b">
              <Avatar src={displayUser?.avatar} size={48} />
              <div>
                <div className="font-medium">{displayUser?.name}</div>
                <div className="text-xs text-gray-500">{displayUser?.email}</div>
              </div>
            </div>
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z"/></svg>
              <input
                value={q}
                onChange={(e)=>{ setQ(e.target.value); setSearchOpen(true) }}
                onKeyDown={onKeyDown}
                onFocus={()=>setSearchOpen(true)}
                placeholder="Search posts or people"
                className="w-full border rounded-full pl-10 px-4 py-2 shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Link to="/friends" onClick={()=>setMobileOpen(false)} className="py-2 px-3 rounded hover:bg-gray-50">Friends</Link>
              <Link to="/messages" onClick={()=>setMobileOpen(false)} className="py-2 px-3 rounded hover:bg-gray-50 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-9 8l-2-2m0 0V5a2 2 0 012-2h14a2 2 0 012 2v14l-4-4H5z"/></svg>
                Messages
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={()=>{ setCreateOpen(true); setMobileOpen(false) }} title="Create post" className="p-2 rounded-full hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              </button>

              {auth.user ? (
                <div className="flex-1">
                  <button onClick={() => { setMobileOpen(false); onLogout() }} className="mt-0 w-full text-left py-2 px-3 rounded hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"/></svg>
                    Logout
                  </button>
                </div>
              ) : (
                <Link to="/login" onClick={()=>setMobileOpen(false)} className="text-sm text-gray-700">Login</Link>
              )}
            </div>
            
            
          </div>
        </div>
      )}
    </div>
  )
}
