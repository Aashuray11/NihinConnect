import React, { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { BASE_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom'
import Avatar from '../components/Avatar'

export default function Messages(){
  const auth = useAuth()
  const [friends, setFriends] = useState<any[]>([])
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [selected, setSelected] = useState<any|null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const location = useLocation()
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const selectedRef = useRef<any | null>(null)
  const typingTimeout = useRef<number | null>(null)
  // mobile view state: on small screens show either friends list or chat (not both)
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)
  const [showFriendsOnMobile, setShowFriendsOnMobile] = useState<boolean>(true)

  useEffect(()=>{
    // open websocket connection for realtime updates with reconnect and queue
    const token = localStorage.getItem('nihiconnect_access')
    if (!token) return

    // Use the centralized BASE_URL only (do not fallback to localhost)
    const apiBase = BASE_URL.replace(/\/$/, '')
    const wsBase = apiBase.replace(/^http/, (m) => (m === 'https' ? 'wss' : 'ws'))
    const url = `${wsBase}/ws/messages/?token=${encodeURIComponent(token)}`

    const reconnectAttempts = { val: 0 }
    const maxReconnect = 10
    const messageQueueRef = { current: [] as any[] }

    const initWS = () => {
      try{
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          console.debug('Messages WS connected', url)
          reconnectAttempts.val = 0
          // flush queued messages
          try{
            while (messageQueueRef.current.length > 0) {
              const p = messageQueueRef.current.shift()
              ws.send(JSON.stringify(p))
            }
          }catch(e){ console.error('failed flushing WS queue', e) }
        }

        ws.onmessage = (ev) => {
          try{
            const data = JSON.parse(ev.data)
            if (data.type === 'new_message' && data.message) {
              const msg = data.message
              const senderId = msg.sender?.id
              const receiverId = msg.receiver?.id || null
              const sel = selectedRef.current
              if (sel && (sel.id === senderId || sel.id === receiverId)) {
                setMessages(prev => {
                  if (msg && msg.id != null && prev.find((x:any)=>x.id === msg.id)) return prev
                  return [...prev, msg]
                })
                try{ api.post('/auth/messages/mark-read/', { user_id: senderId }) }catch(e){}
                try{ api.post('/auth/notifications/mark-all-read/') }catch(e){}
                try{ window.dispatchEvent(new CustomEvent('nihiconnect.notificationsCleared')) }catch(e){}
              } else {
                setFriends(prev => {
                  const copy = prev.map(f => {
                    if (f.id === senderId) {
                      return { ...f, last_text: msg.text, last_time: msg.created_at, last_sender_id: senderId }
                    }
                    return f
                  })
                  if (!copy.find(x=>x.id===senderId) && msg.sender) {
                    copy.unshift({ id: msg.sender.id, name: msg.sender.name, avatar: msg.sender.avatar, last_text: msg.text, last_time: msg.created_at, last_sender_id: senderId, unread: 1 })
                  }
                  return copy.sort((a:any,b:any)=>{ const ua = (a.unread||0); const ub=(b.unread||0); if (ub-ua!==0) return ub-ua; const ta = a.last_time?new Date(a.last_time).getTime():0; const tb = b.last_time?new Date(b.last_time).getTime():0; return tb-ta })
                })
                setUnreadMap(prev => ({ ...prev, [senderId]: (prev[senderId]||0) + 1 }))
              }
            }
          }catch(err){ console.error('WS message parse error', err) }
        }

        ws.onclose = (ev) => {
          console.debug('Messages WS disconnected', ev)
          // try to reconnect with backoff
          if (reconnectAttempts.val < maxReconnect) {
            const wait = Math.min(30000, 500 * Math.pow(2, reconnectAttempts.val))
            reconnectAttempts.val += 1
            setTimeout(()=> initWS(), wait)
          }
        }

        ws.onerror = (err) => {
          console.error('Messages WS error', err)
        }
      }catch(err){ console.error('WS init failed', err) }
    }

    // helper to send safely (queues if not open)
    const safeSend = (payload:any) => {
      try{
        const ws = wsRef.current
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(payload))
        } else {
          // queue for send after reconnect
          messageQueueRef.current.push(payload)
          // ensure ws is being initialized
          initWS()
        }
      }catch(e){ console.error('safeSend failed', e) }
    }

    // expose safe send on ref for other handlers to use
    (wsRef as any).safeSend = safeSend

    initWS()

    return ()=>{ try{ wsRef.current && wsRef.current.close() }catch(e){} }
  }, [])

  // keep a ref in sync with selected so callbacks/handlers can see latest
  useEffect(()=>{ selectedRef.current = selected }, [selected])

  // detect mobile / desktop and update view state
  useEffect(()=>{
    const onResize = ()=>{
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setShowFriendsOnMobile(true)
    }
    try{ window.addEventListener('resize', onResize) }catch(e){}
    try{ onResize() }catch(e){}
    return ()=>{ try{ window.removeEventListener('resize', onResize) }catch(e){} }
  }, [])

  // ensure we join the conversation group when a conversation is selected
  // handle race where WS isn't open yet by attaching an onopen listener
  useEffect(()=>{
    if (!selected) return
    const ws = wsRef.current
    const sendJoin = ()=>{
      try{
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'join', friend_id: selected.id }))
        }
      }catch(e){ console.debug('failed to send join', e) }
    }

    // if ws open now, join immediately
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendJoin()
    } else if (ws) {
      // otherwise, wait for the next open event
      const onOpen = ()=> sendJoin()
      try{ ws.addEventListener('open', onOpen) }catch(e){ /* fallback */ }
      return ()=>{ try{ ws.removeEventListener('open', onOpen) }catch(e){} }
    }
  }, [selected])

  useEffect(()=>{
    let cancelled = false
    const isFetching = { val: false }

    const fetchConversations = async ()=>{
      if (cancelled) return
      // avoid overlapping fetches
      if (isFetching.val) return
      // skip polling when tab is hidden
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      isFetching.val = true
      try{
        // fetch conversation summaries which include friend info, last message and unread count
        const r = await api.get('/auth/messages/conversations/')
        const convs = r.data.conversations || []
        // if conversations endpoint returned empty (or not implemented), fall back to friends list
        if (!convs || convs.length === 0) {
          const rf = await api.get('/auth/friends/')
          const friendsOnly = rf.data.friends || []
          const mappedFallback = friendsOnly.map((f: any) => ({ id: f.id, name: f.name, avatar: f.avatar, email: f.email, last_text: null, last_time: null, last_sender_id: null, unread: 0 }))
          if (!cancelled) {
            setFriends(mappedFallback)
            setUnreadMap({})
          }
          isFetching.val = false
          return
        }
        // map to friend-like objects with conversation metadata
        const mapped = convs.map((c: any) => ({
          id: c.friend.id,
          name: c.friend.name,
          avatar: c.friend.avatar,
          email: c.friend.email,
          last_text: c.last_text,
          last_time: c.last_time,
          last_sender_id: c.last_sender_id,
          unread: c.unread
        }))
        // sort so friends with unread messages appear first, then by most recent message
        mapped.sort((a: any, b: any) => {
          if ((b.unread || 0) - (a.unread || 0) !== 0) return (b.unread || 0) - (a.unread || 0)
          const ta = a.last_time ? new Date(a.last_time).getTime() : 0
          const tb = b.last_time ? new Date(b.last_time).getTime() : 0
          return tb - ta
        })
        if (!cancelled) {
          setFriends(mapped)
          const counts: Record<number, number> = {}
          mapped.forEach((m: any) => { if (m.unread) counts[m.id] = m.unread })
          setUnreadMap(counts)
        }
        // if navigation provided openUserId, open that conversation once friends are loaded
        const openUserId = (location.state as any)?.openUserId
        if (openUserId) {
          const f = mapped.find((x:any)=>x.id === openUserId)
          if (f) {
            // open after a short delay to ensure UI ready
            setTimeout(()=> openConversation(f), 100)
          }
        }
        setApiError(null)
      }catch(err){ 
        console.error('conversations fetch failed', err)
        // try fallback to friends list so UI still shows friends even if conversations endpoint errors
        try{
          const rf = await api.get('/auth/friends/')
          const friendsOnly = rf.data.friends || []
          const mappedFallback = friendsOnly.map((f: any) => ({ id: f.id, name: f.name, avatar: f.avatar, email: f.email, last_text: null, last_time: null, last_sender_id: null, unread: 0 }))
          if (!cancelled) {
            setFriends(mappedFallback)
            setUnreadMap({})
            setApiError(null)
          }
        }catch(err2){
          console.error('friends fallback failed', err2)
          if ((err as any)?.response?.status === 401) {
            setApiError('Please login to view messages')
          } else {
            setApiError('Failed to load conversations and friends')
          }
        }
      }finally{
        isFetching.val = false
      }
    }

    // initial fetch
    fetchConversations()
    // poll every 6 seconds for updates (new messages/unread counts)
    const id = setInterval(fetchConversations, 6000)
    return ()=>{ cancelled = true; clearInterval(id) }
  },[])

  const openConversation = async (friend:any)=>{
    // leave previous conversation group if any
    try{
      const safe = (wsRef as any).safeSend
      if (typeof safe === 'function') {
        safe({ action: 'leave', friend_id: selected.id })
      } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'leave', friend_id: selected.id }))
      }
    }catch(e){}
    setSelected(friend)
    // try to fetch conversation messages if endpoint exists
    try{
      const r = await api.get(`/auth/messages/?user_id=${friend.id}`)
      setMessages(r.data.messages || [])
      // mark messages read for this conversation
      try{ await api.post('/auth/messages/mark-read/', { user_id: friend.id }) }catch(_){ }
      // clear local unread indicator for this friend
      setUnreadMap(prev => ({ ...prev, [friend.id]: 0 }))
      // scroll to bottom after load
      setTimeout(()=>{ messagesRef.current && (messagesRef.current.scrollTop = messagesRef.current.scrollHeight) }, 50)
      // inform websocket to join conversation group so we don't show notification for incoming messages
      try{
        const safe = (wsRef as any).safeSend
        if (typeof safe === 'function') {
          safe({ action: 'join', friend_id: friend.id })
        } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: 'join', friend_id: friend.id }))
        }
      }catch(e){ }
    }catch(err){
      // backend may not implement messaging yet; show empty conversation
      setMessages([])
    }
  }

  const sendMessage = async ()=>{
    if(!selected) return
    const body = text.trim()
    if(!body) return
    try{
      // attempt to send via API
      const r = await api.post('/auth/messages/send/', { receiver_id: selected.id, text: body })
      const newMsg = r.data.message || { id: Date.now(), text: body, sender: auth.user, created_at: new Date().toISOString() }
      setMessages(prev => {
        if (newMsg && newMsg.id != null && prev.find((x:any)=>x.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
      setText('')
      // inform peer we stopped typing
      try{ wsRef.current?.send(JSON.stringify({ action: 'typing', friend_id: selected.id, typing: false })) }catch(e){}
      if (typingTimeout.current) { window.clearTimeout(typingTimeout.current); typingTimeout.current = null }
      setTimeout(()=>{ messagesRef.current && (messagesRef.current.scrollTop = messagesRef.current.scrollHeight) }, 50)
    }catch(err){
      // backend not implemented: just append locally
      setMessages(prev=>[...prev, { id: `tmp-${Date.now()}`, text: body, sender: auth.user, created_at: new Date().toISOString() }])
      setText('')
      try{ wsRef.current?.send(JSON.stringify({ action: 'typing', friend_id: selected.id, typing: false })) }catch(e){}
      if (typingTimeout.current) { window.clearTimeout(typingTimeout.current); typingTimeout.current = null }
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>)=>{
    if (e.key === 'Enter' && !e.shiftKey){
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="max-w-5xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Messages</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Friends column - show on desktop, or on mobile when showFriendsOnMobile is true */}
        {(!isMobile || showFriendsOnMobile) && (
          <div className="col-span-1 border rounded p-2 h-[70vh] overflow-auto bg-white">
            <div className="font-semibold mb-2 text-gray-900">Friends</div>
            {apiError && <div className="text-sm text-red-500 mb-2">{apiError}</div>}
            {!auth.user && <div className="text-sm text-gray-500 mb-2">Please login to see your conversations.</div>}
            {friends.length === 0 && <div className="text-sm text-gray-500">No friends</div>}
            <div className="space-y-2">
              {friends.map((f) => (
                <div
                  key={f.id}
                  onClick={() => {
                    openConversation(f)
                    if (isMobile) setShowFriendsOnMobile(false)
                  }}
                  className={`p-2 rounded hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${
                    selected?.id === f.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <Avatar src={f.avatar} size={48} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`${(unreadMap as any)[f.id] > 0 ? 'font-bold text-gray-900' : 'font-medium'}`}>
                        {f.name}
                      </div>
                      {(unreadMap as any)[f.id] > 0 && (
                        <span className="text-xs text-white bg-red-500 rounded-full px-2 ml-2">{(unreadMap as any)[f.id]}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{f.last_text ? f.last_text : 'No messages yet'}</div>
                  </div>
                  <div className="text-xs text-gray-400 ml-2">{f.last_time ? new Date(f.last_time).toLocaleTimeString() : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat column - show on desktop, or on mobile when friends are hidden */}
        {(!isMobile || !showFriendsOnMobile) && (
          <div className="col-span-2 border rounded p-0 h-[70vh] flex flex-col bg-white">
            {!selected ? (
              <div className="m-auto text-center text-gray-500">Select a friend to start chatting</div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 border-b p-4">
                  {isMobile && (
                    <button
                      onClick={() => {
                        try {
                          const safe = (wsRef as any).safeSend
                          if (typeof safe === 'function') {
                            safe({ action: 'leave', friend_id: selected.id })
                          } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selected) {
                            wsRef.current.send(JSON.stringify({ action: 'leave', friend_id: selected.id }))
                          }
                        } catch (e) {}
                        setShowFriendsOnMobile(true)
                      }}
                      className="mr-2 p-2 rounded hover:bg-gray-100"
                    >
                      Back
                    </button>
                  )}
                  <Avatar src={selected.avatar} size={48} />
                  <div className="font-medium">{selected.name}</div>
                </div>

                <div ref={messagesRef} className="flex-1 overflow-auto p-4 space-y-3">
                  {messages.length === 0 && <div className="text-sm text-gray-500">No messages yet</div>}
                  {messages.map((m) => (
                    <div key={m.id} className={`flex items-end gap-2 ${m.sender?.id === auth.user?.id ? 'justify-end' : 'justify-start'}`}>
                      {m.sender?.id !== auth.user?.id && <Avatar src={m.sender?.avatar} size={32} />}
                      <div className={`${m.sender?.id === auth.user?.id ? 'bg-green-100 text-gray-900' : 'bg-gray-100 text-gray-900'} max-w-[70%] p-3 rounded-lg`}>
                        <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                        <div className="text-xs text-gray-500 mt-1 text-right">{new Date(m.created_at).toLocaleTimeString()}</div>
                      </div>
                      {m.sender?.id === auth.user?.id && <Avatar src={m.sender?.avatar} size={32} />}
                    </div>
                  ))}
                </div>

                <div className="border-t p-3 flex items-center gap-2">
                  <input
                    value={text}
                    onChange={(e) => {
                      const v = e.target.value
                      setText(v)
                      if (!selected) return
                      try {
                        const safe = (wsRef as any).safeSend
                        if (typeof safe === 'function') safe({ action: 'typing', friend_id: selected.id, typing: true })
                        else wsRef.current?.send(JSON.stringify({ action: 'typing', friend_id: selected.id, typing: true }))
                      } catch (e) {}
                      if (typingTimeout.current) window.clearTimeout(typingTimeout.current)
                      typingTimeout.current = window.setTimeout(() => {
                        try {
                          const safe = (wsRef as any).safeSend
                          if (typeof safe === 'function') safe({ action: 'typing', friend_id: selected.id, typing: false })
                          else wsRef.current?.send(JSON.stringify({ action: 'typing', friend_id: selected.id, typing: false }))
                        } catch (e) {}
                        typingTimeout.current = null
                      }, 2000) as unknown as number
                    }}
                    onKeyDown={onKeyDown}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Write a message... (Enter to send, Shift+Enter for newline)"
                  />
                  <button onClick={sendMessage} title="Send" className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center">
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
