import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import { api } from '../services/api'
import Card from './Card'
import { useLocation } from 'react-router-dom'

export default function PostCard({post, isFriend}:{post:any, isFriend?:boolean}){
  const navigate = useNavigate()
  const disabledClass = "text-gray-400 cursor-not-allowed"
  const iconClass = "w-5 h-5 inline-block mr-2 align-middle"
  const placeholder = `https://picsum.photos/seed/${post.id || 'p'}/800/420`
  const [likesCount, setLikesCount] = useState<number>(post.likes_count ?? 0)
  const [liked, setLiked] = useState<boolean>(!!post.liked_by_user)
  const [showLikes, setShowLikes] = useState<boolean>(false)
  const [likesList, setLikesList] = useState<any[] | null>(null)
  const [loadingLikes, setLoadingLikes] = useState(false)
  const likesRef = useRef<HTMLDivElement | null>(null)
  const likesTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [commentsCount, setCommentsCount] = useState<number>(post.comments_count ?? 0)
  const [showComments, setShowComments] = useState<boolean>(false)
  const [commentsList, setCommentsList] = useState<any[] | null>(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [newCommentText, setNewCommentText] = useState<string>('')
  const [showShare, setShowShare] = useState<boolean>(false)
  const [shareFriends, setShareFriends] = useState<any[] | null>(null)
  const [loadingShareFriends, setLoadingShareFriends] = useState(false)
  const shareRef = useRef<HTMLDivElement | null>(null)
  const shareTriggerRef = useRef<HTMLButtonElement | null>(null)
  const modalShareRef = useRef<HTMLDivElement | null>(null)
  const modalShareTriggerRef = useRef<HTMLButtonElement | null>(null)
  const location = useLocation()

  useEffect(() => {
    // sync local like state when post prop changes (e.g. after login/logout or refetch)
    setLiked(!!post.liked_by_user)
    setLikesCount(post.likes_count ?? 0)
    setCommentsCount(post.comments_count ?? 0)
  }, [post?.id, post?.liked_by_user, post?.likes_count, post?.comments_count])

  // click-away for likes popover
  useEffect(()=>{
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
  useEffect(()=>{
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (!showShare) return
      if (shareRef.current && shareRef.current.contains(t)) return
      if (modalShareRef.current && modalShareRef.current.contains(t)) return
      if (shareTriggerRef.current && shareTriggerRef.current.contains(t)) return
      if (modalShareTriggerRef.current && modalShareTriggerRef.current.contains(t)) return
      setShowShare(false)
    }
    document.addEventListener('click', onDocClick)
    return ()=> document.removeEventListener('click', onDocClick)
  }, [showShare])

  const [showFull, setShowFull] = useState<boolean>(false)

  const openFull = () => setShowFull(true)
  const closeFull = () => setShowFull(false)

  const fullText = post.text || post.description || ''
  const descriptionRef = useRef<HTMLDivElement | null>(null)
  const [descriptionOverflow, setDescriptionOverflow] = useState<boolean>(false)

  useEffect(() => {
    const el = descriptionRef.current
    const check = () => {
      if (!el) return
      // allow layout to settle
      setTimeout(() => {
        setDescriptionOverflow(el.scrollWidth > el.clientWidth + 1)
      }, 0)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [post?.text, post?.description])

  return (
    <Card className="cursor-pointer p-0" onClick={openFull}>

      <div className="px-5 pt-4 pb-3 w-full">
        <div className="flex items-start gap-3">
          <div className="cursor-pointer" onClick={(e)=>{ e.stopPropagation(); navigate(`/profile?id=${post.author}`) }}>
            <Avatar src={post.author_avatar} />
          </div>
          <div className="flex-1">
            <div className="font-semibold leading-tight text-gray-900">{post.author_name}</div>
            <div className="text-xs text-gray-500 mt-1">{post.time}</div>
          </div>
        </div>

        {/* single-line truncated description with inline 'more' */}
        <div className="relative mt-3 w-full">
          <div
            ref={descriptionRef}
            className="text-gray-800 leading-6 w-full"
            style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', paddingRight: '3.5rem'}}
          >{fullText}</div>
          {descriptionOverflow && (
            <button
              onClick={(e)=>{ e.stopPropagation(); openFull() }}
              className="absolute right-0 top-0 text-sm text-blue-600 px-2"
              aria-label="Read more"
            >... more</button>
          )}
        </div>

        {/* image (centered) */}
        {post.image || placeholder ? (
          <div className="mt-4 w-full flex items-center justify-center">
            <div className="h-64 w-full max-w-full sm:max-w-xl overflow-hidden rounded bg-gray-50">
              <img
                src={post.image || placeholder}
                alt="post"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : null}

        {/* bottom actions (like + comment) with counts */}
          <div className="mt-4 w-full flex items-center justify-start gap-2 sm:gap-4 text-sm text-gray-700 relative flex-nowrap">
            <div className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 order-1 sm:order-1 ${liked ? 'text-red-600' : 'text-gray-700'}`}> 
              <button
                onClick={async (e) => { e.stopPropagation(); try { const res = await api.post(`/posts/${post.id}/like/`); setLiked(res.data.liked); setLikesCount(res.data.likes_count) } catch (err) { console.error(err) } }}
                className="flex items-center gap-2"
                aria-label={liked ? 'Unlike' : 'Like'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}><path d="M12 21s-7-4.434-9.5-7.5C-1.5 8 4 4 7 6c1 .7 2 1.5 5 4 3-2.5 4-3 5-4 3-2 8.5 2 4.5 7.5C19 16 12 21 12 21z"/></svg>
                <span className="text-sm">{liked ? 'Liked' : 'Like'}</span>
              </button>

              <button
                ref={likesTriggerRef}
                onClick={async (e) => { e.stopPropagation(); if (!likesList) { setLoadingLikes(true); try{ const res = await api.get(`/posts/${post.id}/likes/`); setLikesList(res.data) }catch(err){console.error(err)} setLoadingLikes(false) } setShowLikes(s=>!s) }}
                className="ml-2 text-xs text-gray-500 focus:outline-none"
                aria-label="Show likes"
              >{likesCount}</button>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setShowComments(s => !s); if (!commentsList) { (async ()=>{ setLoadingComments(true); try{ const res = await api.get(`/posts/${post.id}/comments/`); setCommentsList(res.data) }catch(err){console.error(err)} setLoadingComments(false) })() } }}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 text-gray-700 order-2 sm:order-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span className="text-sm">Comment</span>
              <span className="ml-2 text-xs text-gray-500">{commentsCount}</span>
            </button>

            <div className="ml-2 flex items-center gap-2 order-3 sm:order-3">
              <button ref={shareTriggerRef} onClick={async (e)=>{ e.stopPropagation(); if (!shareFriends) { setLoadingShareFriends(true); try{ const r = await api.get('/auth/friends/'); setShareFriends(r.data.friends || []) }catch(err){ console.error(err) } setLoadingShareFriends(false) } setShowShare(s=>!s) }} className="hidden sm:flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M16 6l-4-4-4 4"/></svg>
                <span className="text-sm">Share</span>
              </button>

              {/* ellipsis for small screens - inline next to actions */}
              <button onClick={async (e)=>{ e.stopPropagation(); if (!shareFriends) { setLoadingShareFriends(true); try{ const r = await api.get('/auth/friends/'); setShareFriends(r.data.friends || []) }catch(err){ console.error(err) } setLoadingShareFriends(false) } setShowShare(s=>!s) }} className="sm:hidden p-2 rounded hover:bg-gray-100 text-gray-700 flex-shrink-0 order-3" aria-label="More">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
              </button>
            </div>
          </div>
      </div>

      {/* likes list popover/modal */}
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

      {!showFull && showShare && (
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
                  <div className="flex items-center gap-2 cursor-pointer" onClick={async (e)=>{ e.stopPropagation(); try{ await api.post('/auth/messages/send/', { receiver_id: u.id, text: `Shared a post: ${fullText?.slice(0,120) || ''} (post id ${post.id})` }); alert('Shared to '+(u.name||u.id)); setShowShare(false); navigate('/messages', { state: { openUserId: u.id } }); }catch(err){ console.error(err); alert('Failed to share') } }}>
                    <Avatar src={u.avatar} />
                    <div>{u.name}</div>
                  </div>
                  <div>
                    <button onClick={async (e)=>{ e.stopPropagation(); try{ await api.post('/auth/messages/send/', { receiver_id: u.id, text: `Shared a post: ${fullText?.slice(0,120) || ''} (post id ${post.id})` }); alert('Shared to '+(u.name||u.id)); setShowShare(false); navigate('/messages', { state: { openUserId: u.id } }); }catch(err){ console.error(err); alert('Failed to share') } }} className="text-sm text-blue-600">Send</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full post modal */}
      {showFull && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={closeFull} />
          <div className="bg-white rounded shadow-lg z-10 w-full max-w-6xl mx-4 max-h-[90vh] overflow-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex flex-col-reverse md:flex-row md:gap-6">
                {/* image column */}
                <div className="md:w-1/2 w-full flex items-center justify-center p-4 mt-4 md:mt-0">
                  <div className="w-full h-64 sm:h-96 md:h-[70vh] max-h-[70vh] max-w-3xl overflow-hidden rounded bg-gray-50 flex items-center justify-center relative">
                    <img src={post.image || placeholder} alt="post" className="w-full h-full object-cover object-center" />

                    {/* small-screen vertical icon column - positioned at right of image */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-3 md:hidden z-20">
                      <button onClick={async (e)=>{ e.stopPropagation(); try{ const res = await api.post(`/posts/${post.id}/like/`); setLiked(res.data.liked); setLikesCount(res.data.likes_count) }catch(err){console.error(err)} }} aria-label="Like" className="bg-white/90 p-2 rounded-full shadow">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}><path d="M12 21s-7-4.434-9.5-7.5C-1.5 8 4 4 7 6c1 .7 2 1.5 5 4 3-2.5 4-3 5-4 3-2 8.5 2 4.5 7.5C19 16 12 21 12 21z"/></svg>
                      </button>

                      <button onClick={(e)=>{ e.stopPropagation(); setShowComments(s=>!s); if (!commentsList) { (async ()=>{ setLoadingComments(true); try{ const res = await api.get(`/posts/${post.id}/comments/`); setCommentsList(res.data) }catch(err){console.error(err)} setLoadingComments(false) })() } }} aria-label="Comment" className="bg-white/90 p-2 rounded-full shadow">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      </button>

                      <button ref={modalShareTriggerRef} onClick={async (e)=>{ e.stopPropagation(); if (!shareFriends) { setLoadingShareFriends(true); try{ const r = await api.get('/auth/friends/'); setShareFriends(r.data.friends || []) }catch(err){ console.error(err) } setLoadingShareFriends(false) } setShowShare(s=>!s) }} aria-label="Share" className="bg-white/90 p-2 rounded-full shadow">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M16 6l-4-4-4 4"/></svg>
                      </button>
                    </div>

                    {/* in-modal share panel (renders above image) */}
                    {showFull && showShare && (
                      <div ref={modalShareRef} className="absolute right-6 top-6 z-50 w-64">
                        <div className="bg-white rounded shadow-lg p-3 w-full max-h-64 overflow-auto">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-semibold">Share post</div>
                            <button onClick={(e)=>{ e.stopPropagation(); setShowShare(false) }} className="text-sm text-gray-500">Close</button>
                          </div>
                          <div className="space-y-2">
                            {loadingShareFriends && <div className="text-sm text-gray-500">Loading...</div>}
                            {!loadingShareFriends && (!shareFriends || shareFriends.length === 0) && <div className="text-sm text-gray-500">No friends</div>}
                            {!loadingShareFriends && shareFriends && shareFriends.map((u: any) => (
                              <div key={u.id} className="flex items-center gap-3 justify-between" onClick={(e)=>e.stopPropagation()}>
                                <div className="flex items-center gap-2 cursor-pointer" onClick={async (e)=>{ e.stopPropagation(); try{ await api.post('/auth/messages/send/', { receiver_id: u.id, text: `Shared a post: ${fullText?.slice(0,120) || ''} (post id ${post.id})` }); alert('Shared to '+(u.name||u.id)); setShowShare(false); navigate('/messages', { state: { openUserId: u.id } }); }catch(err){ console.error(err); alert('Failed to share') } }}>
                                  <Avatar src={u.avatar} />
                                  <div>{u.name}</div>
                                </div>
                                <div>
                                  <button onClick={async (e)=>{ e.stopPropagation(); try{ await api.post('/auth/messages/send/', { receiver_id: u.id, text: `Shared a post: ${fullText?.slice(0,120) || ''} (post id ${post.id})` }); alert('Shared to '+(u.name||u.id)); setShowShare(false); navigate('/messages', { state: { openUserId: u.id } }); }catch(err){ console.error(err); alert('Failed to share') } }} className="text-sm text-blue-600">Send</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                 </div>

              {/* details column */}
              <div className="md:w-1/2 w-full p-4 flex flex-col">
                <div className="flex items-start gap-3">
                  <div className="cursor-pointer" onClick={(e)=>{ e.stopPropagation(); navigate(`/profile?id=${post.author}`) }}>
                    <Avatar src={post.author_avatar} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{post.author_name}</div>
                        <div className="text-xs text-gray-500">{post.time}</div>
                      </div>
                      <div>
                        <button onClick={closeFull} className="text-sm text-gray-500">Close</button>
                      </div>
                    </div>

                    <div className="mt-3 text-gray-800 whitespace-pre-wrap max-h-[40vh] overflow-auto">{fullText}</div>
                  </div>
                </div>

                <div className="mt-4 hidden md:block">
                  <div className="flex items-center justify-start gap-4 text-sm text-gray-700">
                    <div className={`flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 ${liked ? 'text-red-600' : 'text-gray-700'}`}>
                      <button
                        onClick={async (e) => { e.stopPropagation(); try { const res = await api.post(`/posts/${post.id}/like/`); setLiked(res.data.liked); setLikesCount(res.data.likes_count) } catch (err) { console.error(err) } }}
                        className="flex items-center gap-2"
                        aria-label={liked ? 'Unlike' : 'Like'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}><path d="M12 21s-7-4.434-9.5-7.5C-1.5 8 4 4 7 6c1 .7 2 1.5 5 4 3-2.5 4-3 5-4 3-2 8.5 2 4.5 7.5C19 16 12 21 12 21z"/></svg>
                        <span className="text-base">{liked ? 'Liked' : 'Like'}</span>
                      </button>
                      <div className="text-sm text-gray-500">{likesCount}</div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 text-gray-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <span className="text-base">Comment</span>
                      <span className="ml-2 text-sm text-gray-500">{commentsCount}</span>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <button ref={shareTriggerRef} onClick={async (e)=>{ e.stopPropagation(); if (!shareFriends) { setLoadingShareFriends(true); try{ const r = await api.get('/auth/friends/'); setShareFriends(r.data.friends || []) }catch(err){ console.error(err) } setLoadingShareFriends(false) } setShowShare(s=>!s) }} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M16 6l-4-4-4 4"/></svg>
                        <span className="text-base">Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* comments list popover/modal */}
      {showComments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowComments(false)} />
          <div className="bg-white rounded shadow-lg p-4 z-10 max-w-md w-full">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">Comments</div>
              <button onClick={() => setShowComments(false)} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="space-y-3 max-h-72 overflow-auto">
              {loadingComments && <div className="text-sm text-gray-500">Loading...</div>}
              {!loadingComments && (!commentsList || commentsList.length === 0) && <div className="text-sm text-gray-500">No comments yet</div>}
              {!loadingComments && commentsList && commentsList.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3">
                  <Avatar src={c.user_avatar} />
                  <div>
                    <div className="text-sm font-medium">{c.user_name}</div>
                    <div className="text-sm text-gray-700">{c.text}</div>
                    <div className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}

              {/* add comment input */}
              <div className="mt-3">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                  placeholder="Write a comment..."
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={async () => {
                      const text = newCommentText.trim()
                      if (!text) return
                      setLoadingComments(true)
                      try {
                        const res = await api.post(`/posts/${post.id}/comments/`, { text })
                        // prepend new comment to list and update count
                        setCommentsList(prev => prev ? [res.data, ...prev] : [res.data])
                        setCommentsCount(c => c + 1)
                        setNewCommentText('')
                      } catch (err: any) {
                        console.error(err)
                        if (err?.response?.status === 401) {
                          alert('Please login to post a comment')
                        }
                      }
                      setLoadingComments(false)
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  >Post</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
