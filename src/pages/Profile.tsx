import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import Button from '../components/Button'
import Avatar from '../components/Avatar'
import PostCard from '../components/PostCard'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function Profile(){
  const auth = useAuth()
  const user = auth.user
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  useEffect(()=>{ console.debug('Profile mounted', user, 'params', searchParams.toString()) }, [])
  const [name, setName] = useState(user?.name||'')
  const [bio, setBio] = useState((user as any)?.bio||'')
  const [profile, setProfile] = useState<any>(null)
  const [isOwn, setIsOwn] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [connections, setConnections] = useState<any[] | null>(null)
  const [posts, setPosts] = useState<any[] | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(()=>{
    // cleanup preview URL when component unmounts or file changes
    return ()=>{
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  },[previewUrl])

  // react to ?id= query param: if id is present and different from current user, fetch that profile
  useEffect(()=>{
    const id = searchParams.get('id')
    if (!id || !auth.user || String(auth.user.id) === String(id)){
      // show own profile: fetch enriched profile (with counts and friends_preview)
      setLoading(true)
      setIsOwn(true)
      ;(async ()=>{
        try{
          const res = await api.get('/auth/profile/')
          setProfile(res.data)
          setName(res.data.name || '')
          setBio(res.data.bio || '')
          setConnections(res.data.friends_preview || [])
          // fetch own posts via feed and filter
          try{
            const feed = await api.get('/posts/feed/')
            const combined = [ ...(feed.data?.friends || []), ...(feed.data?.others || []) ]
            setPosts(combined.filter((pp:any)=>String(pp.author)===String(res.data.id)))
          }catch(e){ setPosts([]) }
        }catch(err){
          console.error('failed fetching own profile', err)
          setProfile(auth.user)
          setName(auth.user?.name || '')
          setBio((auth.user as any)?.bio || '')
        }finally{ setLoading(false) }
      })()
      return
    }

    // viewing another user's profile: set state immediately so we don't show current user's data
    setIsOwn(false)
    setProfile(null)
    setName('')
    setBio('')
    setLoading(true)

    // fetch other user's profile
    let cancelled = false
    ;(async ()=>{
      try{
        const res = await api.get(`/auth/profile/?id=${encodeURIComponent(id)}`)
        if (cancelled) return
        setProfile(res.data)
        setName(res.data.name || '')
        setBio(res.data.bio || '')

        // fetch posts for this profile (try multiple endpoints)
        try{
          const p = await api.get(`/posts/?author=${encodeURIComponent(id)}`)
          if (!cancelled) setPosts(p.data || [])
        }catch(err){
          // fallback: fetch feed and filter
          try{
            const feed = await api.get('/posts/feed/')
            const combined = [ ...(feed.data?.friends || []), ...(feed.data?.others || []) ]
            if (!cancelled) setPosts(combined.filter((pp:any)=>String(pp.author)===String(id)))
          }catch(e){
            if (!cancelled) setPosts([])
          }
        }

        // use friends preview included in profile response (if present)
        try{
          if (res.data && res.data.friends_preview){
            if (!cancelled) setConnections(res.data.friends_preview || [])
          } else {
            if (!cancelled) setConnections([])
          }
        }catch(err){ if (!cancelled) setConnections([]) }

      }catch(err){
        console.error('fetch profile failed', err)
        // if user not found, navigate back to feed
        if (!cancelled) navigate('/feed')
      }finally{
        if (!cancelled) setLoading(false)
      }
    })()

    return ()=>{ cancelled = true }
  }, [searchParams, auth.user])

  const onFileChange = (f: File | null)=>{
    setAvatarFile(f)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (f) setPreviewUrl(URL.createObjectURL(f))
  }

  const save = async ()=>{
    const form = new FormData()
    form.append('name', name)
    form.append('bio', bio)
    if (avatarFile) form.append('avatar', avatarFile)
    try{
      // let the browser set Content-Type for multipart
      const resp = await api.put('/auth/profile/', form)
      auth.setUser(resp.data)
      setProfile(resp.data)
      localStorage.setItem('nihiconnect_user', JSON.stringify(resp.data))
      alert('Profile updated')
    }catch(err:any){
      alert('Update failed: '+(err.response?.data||err.message))
    }
  }
  return (
    <div className="max-w-6xl mx-auto mt-12 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: profile card */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="h-44 bg-gray-200 w-full relative overflow-hidden">
              <img src={(profile?.cover_image) || 'https://picsum.photos/seed/cover/800/300'} alt="cover" className="w-full h-full object-cover object-center" />
            </div>
            <div className="p-6 pt-4">
              <div className="-mt-12 pl-4 relative z-20 -ml-4">
                <Avatar src={(profile?.avatar) || null} size={96} className="ring-4 ring-white shadow-lg cursor-pointer z-20" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold">{profile?.name || 'Unknown'}</div>
                  <div className="text-sm text-gray-600 mt-1">{profile?.bio || 'No bio yet'}</div>
                  <div className="mt-3 text-sm text-gray-700 space-y-1">
                    {profile?.school && <div><strong>School:</strong> {profile.school}</div>}
                    {profile?.email && <div><strong>Email:</strong> {profile.email}</div>}
                    {profile?.location && <div><strong>Location:</strong> {profile.location}</div>}
                  </div>
                </div>
                {isOwn && (
                  <div className="flex-shrink-0">
                    {/* small screens: show icon-only pencil button to save space */}
                    <button onClick={()=>navigate('/profile/edit')} className="md:hidden p-2 bg-blue-600 text-white rounded flex items-center justify-center" aria-label="Edit profile">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                    {/* md+ screens: show full text button */}
                    <div className="hidden md:block mt-0">
                      <Button onClick={()=>navigate('/profile/edit')}>Edit Profile</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* connections box */}
              <div className="mt-6 border-t pt-4">
                <div className="grid grid-cols-3 text-center">
                  <div>
                    <div className="text-xl font-semibold">{profile?.connections_count ?? 0}</div>
                    <div className="text-xs text-gray-500">Connections</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{profile?.friends_count ?? 0}</div>
                    <div className="text-xs text-gray-500">Friends</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{profile?.posts_count ?? 0}</div>
                    <div className="text-xs text-gray-500">Posts</div>
                  </div>
                </div>
                <div className="mt-4">
                  <button className="w-full px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>navigate('/friends')}>View Connections</button>
                </div>
                {/* show up to 2 connection previews */}
                {connections && connections.length>0 && (
                  <div className="mt-4 border-t pt-3">
                    <div className="text-sm font-semibold mb-2">Connections</div>
                    <div className="flex items-center gap-3">
                      {connections.slice(0,2).map((c:any)=> (
                        <div key={c.id} className="flex items-center gap-2 cursor-pointer" onClick={()=>navigate(`/profile?id=${c.id}`)}>
                          <Avatar src={c.avatar} size={40} />
                          <div className="text-sm">{c.name}</div>
                        </div>
                      ))}
                      {connections.length>2 && (
                        <button onClick={()=>navigate('/friends')} className="ml-2 text-sm text-blue-600 underline">View more</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: posts and details */}
        <div className="md:col-span-2">
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">Activity</div>
                {isOwn && <div className="text-sm text-gray-500">Your recent posts</div>}
              </div>
              <div className="mt-4">
                {/* Render posts fetched into `posts` state, or fallback to profile.posts */}
                {loading ? (
                  <div className="text-sm text-gray-500">Loading posts...</div>
                ) : (!posts || posts.length===0) ? (
                  <div className="text-sm text-gray-500">No posts yet.</div>
                ) : (
                  posts.map((p:any)=> (
                    <div key={p.id} className="mb-3 relative">
                      {/* Delete button for own profile posts */}
                      {isOwn && (
                        <button
                          onClick={async (e)=>{
                            e.stopPropagation()
                            if (!confirm('Delete this post?')) return
                            try{
                              await api.delete(`/posts/${p.id}/`)
                              setPosts(prev => prev ? prev.filter(x=>x.id!==p.id) : [])
                            }catch(err:any){
                              alert('Failed to delete: '+(err.response?.data?.detail || err.message))
                            }
                          }}
                          className="absolute right-2 top-2 z-20 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                        >Delete</button>
                      )}
                      <PostCard post={p} isFriend={true} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
