import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import { api } from '../services/api'
// (useState imported from React above)
import Card from './Card'

export default function CompactPost({post, isFriend, onOpen}:{post:any, isFriend?:boolean, onOpen?:()=>void}){
  const navigate = useNavigate()
  const [showLikes, setShowLikes] = useState(false)
  const [likesList, setLikesList] = useState<any[] | null>(null)
  const [loadingLikes, setLoadingLikes] = useState(false)
  const [showShare, setShowShare] = useState<boolean>(false)
  const [shareFriends, setShareFriends] = useState<any[] | null>(null)
  const [loadingShareFriends, setLoadingShareFriends] = useState(false)
  const shareRef = React.useRef<HTMLDivElement | null>(null)
  const shareTriggerRef = React.useRef<HTMLButtonElement | null>(null)
  // navigate already declared above
  const likesRef = React.useRef<HTMLDivElement | null>(null)
  const likesTriggerRef = React.useRef<HTMLButtonElement | null>(null)
  const placeholder = `https://picsum.photos/seed/${post.id || 'p'}/900/540`
  const fullText = post.text || post.description || ''
  const descriptionRef = useRef<HTMLDivElement | null>(null)
  const [descriptionOverflow, setDescriptionOverflow] = useState<boolean>(false)
  const disabledClass = 'opacity-50 cursor-not-allowed text-gray-400'

  const formatCount = (n:any) => {
    if (n === undefined || n === null) return ''
    if (typeof n !== 'number') return String(n)
    if (n < 1000) return String(n)
    if (n < 1000000) return `${Math.round(n/100)/10}K`
    return `${Math.round(n/100000)/10}M`
  }

  const likes = post.likes_count ?? post.likes ?? 21000
  const comments = post.comments_count ?? post.comments ?? 104
  const shares = post.shares_count ?? post.shares ?? 17

  // click-away close for likes popover
  React.useEffect(()=>{
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (!showLikes) return
      if (likesRef.current && likesRef.current.contains(t)) return
      if (likesTriggerRef.current && likesTriggerRef.current.contains(t)) return
      setShowLikes(false)
    }
    document.addEventListener('click', onDocClick)
    return ()=> document.removeEventListener('click', onDocClick)
  }, [showLikes])

  // click-away for share popover
  React.useEffect(()=>{
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (!showShare) return
      if (shareRef.current && shareRef.current.contains(t)) return
      if (shareTriggerRef.current && shareTriggerRef.current.contains(t)) return
      setShowShare(false)
    }
    document.addEventListener('click', onDocClick)
    return ()=> document.removeEventListener('click', onDocClick)
  }, [showShare])

  // detect single-line overflow to show "Read more"
  useEffect(() => {
    const el = descriptionRef.current
    const check = () => {
      if (!el) return
      setTimeout(() => {
        setDescriptionOverflow(el.scrollWidth > el.clientWidth + 1)
      }, 0)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [post?.text, post?.description])

  return (
    <Card onClick={()=>onOpen && onOpen()} className={`cursor-pointer overflow-hidden hover:shadow-md transition p-0`}>
      {/* header: avatar, name, time */}
      <div className="p-3 w-full">
        <div className="flex items-start gap-3">
          <div className="cursor-pointer" onClick={(e)=>{ e.stopPropagation(); navigate(`/profile?id=${post.author}`) }}>
            <Avatar size={40} src={post.author_avatar} />
          </div>
          <div>
            <div className="text-sm font-semibold">{post.author_name}</div>
            <div className="text-xs text-gray-500 mt-1">{post.time}</div>
          </div>
        </div>
        {/* single-line description with Read more when overflow */}
        <div
          ref={descriptionRef}
          className="mt-2 text-gray-800 whitespace-pre-wrap leading-6 max-h-6 overflow-hidden w-full"
          style={{display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical'}}
        >{fullText}</div>
        {descriptionOverflow && (
          <div className="mt-1 text-sm text-blue-600 cursor-pointer" onClick={(e)=>{ e.stopPropagation(); onOpen && onOpen() }} role="button">Read more</div>
        )}
        {/* single-line truncated description with inline 'more' */}
        <div className="relative mt-2 w-full">
          <div
            ref={descriptionRef}
            className="text-gray-800 leading-6 w-full"
            style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', paddingRight: '3.5rem'}}
          >{fullText}</div>
          {descriptionOverflow && (
            <button
              onClick={(e)=>{ e.stopPropagation(); onOpen && onOpen() }}
              className="absolute right-0 top-0 text-sm text-blue-600 px-2"
            >... more</button>
          )}
        </div>
      </div>

      <div className="w-full flex items-center justify-center bg-gray-100">
        <div className="h-64 w-full max-w-2xl overflow-hidden">
          <img src={post.image || placeholder} alt="post" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="py-3 w-full flex items-center justify-start gap-2 sm:gap-4 text-sm text-gray-500 px-4 flex-nowrap">
        <button ref={likesTriggerRef} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100" onClick={(e)=>{ e.stopPropagation(); if (!likesList) { (async ()=>{ setLoadingLikes(true); try{ const res = await api.get(`/posts/${post.id}/likes/`); setLikesList(res.data) }catch(err){console.error(err)} setLoadingLikes(false) })() } setShowLikes(s=>!s) }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.434-9.5-7.5C-1.5 8 4 4 7 6c1 .7 2 1.5 5 4 3-2.5 4-3 5-4 3-2 8.5 2 4.5 7.5C19 16 12 21 12 21z"/></svg>
          <span>Like</span>
          <span className="ml-2 text-xs text-gray-500">{formatCount(likes)}</span>
        </button>
        <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>Comment</span>
          <span className="ml-2 text-xs text-gray-500">{formatCount(comments)}</span>
        </button>
        <div>
          <div className="flex items-center gap-2 order-3 sm:order-3">
            <button ref={shareTriggerRef} className="hidden sm:flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 text-gray-700" onClick={async (e)=>{ e.stopPropagation(); if (!shareFriends) { setLoadingShareFriends(true); try{ const r = await api.get('/auth/friends/'); setShareFriends(r.data.friends || []) }catch(err){ console.error(err) } setLoadingShareFriends(false) } setShowShare(s=>!s) }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M16 6l-4-4-4 4"/></svg>
              <span>Share</span>
            </button>

            <button onClick={async (e)=>{ e.stopPropagation(); if (!shareFriends) { setLoadingShareFriends(true); try{ const r = await api.get('/auth/friends/'); setShareFriends(r.data.friends || []) }catch(err){ console.error(err) } setLoadingShareFriends(false) } setShowShare(s=>!s) }} className="sm:hidden p-2 rounded hover:bg-gray-100 text-gray-700 flex-shrink-0 order-3" aria-label="More">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
            </button>
          </div>
        </div>
      </div>

      {showLikes && (
        <div ref={likesRef} className="mt-2">
          <div className="bg-white rounded shadow-lg p-3 z-10 w-64 max-h-64 overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">Likes</div>
              <button onClick={() => setShowLikes(false)} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="space-y-2">
              {loadingLikes && <div className="text-sm text-gray-500">Loading...</div>}
              {!loadingLikes && (!likesList || likesList.length === 0) && <div className="text-sm text-gray-500">No likes yet</div>}
              {!loadingLikes && likesList && likesList.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar src={u.avatar} />
                  <div>{u.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showShare && (
        <div ref={shareRef} className="mt-2 z-50 w-full sm:w-auto">
          <div className="bg-white rounded shadow-lg p-3 w-full sm:w-64 max-h-64 overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">Share post</div>
              <button onClick={() => setShowShare(false)} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="space-y-2">
              {loadingShareFriends && <div className="text-sm text-gray-500">Loading...</div>}
              {!loadingShareFriends && (!shareFriends || shareFriends.length === 0) && <div className="text-sm text-gray-500">No friends</div>}
              {!loadingShareFriends && shareFriends && shareFriends.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={async (e)=>{ e.stopPropagation(); try{ await api.post('/auth/messages/send/', { receiver_id: u.id, text: `Shared a post: ${(post.text||'').slice(0,120)} (post id ${post.id})` }); alert('Shared to '+(u.name||u.id)); setShowShare(false); navigate('/messages', { state: { openUserId: u.id } }); }catch(err){ console.error(err); alert('Failed to share') } }}>
                    <Avatar src={u.avatar} />
                    <div>{u.name}</div>
                  </div>
                  <div>
                    <button onClick={async (e)=>{ e.stopPropagation(); try{ await api.post('/auth/messages/send/', { receiver_id: u.id, text: `Shared a post: ${(post.text||'').slice(0,120)} (post id ${post.id})` }); alert('Shared to '+(u.name||u.id)); setShowShare(false); navigate('/messages', { state: { openUserId: u.id } }); }catch(err){ console.error(err); alert('Failed to share') } }} className="text-sm text-blue-600">Send</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
