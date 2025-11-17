import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import PostCard from '../components/PostCard'
import CompactPost from '../components/CompactPost'
import FeedSlider from '../components/FeedSlider'
import SidebarLeft from '../components/SidebarLeft'
import SidebarRight from '../components/SidebarRight'

export default function Feed(){
  const [friendsPosts, setFriendsPosts] = useState<any[]>([])
  const [otherPosts, setOtherPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [friendIds, setFriendIds] = useState<number[]>([])
  const [selectedPost, setSelectedPost] = useState<any>(null)

  useEffect(()=>{
    const load = async ()=>{
      setLoading(true)
      try{
        const r = await api.get('/posts/feed/')
        setFriendsPosts(r.data.friends || [])
        setOtherPosts(r.data.others || [])
        // try to fetch profile + friends
        try{
          const p = await api.get('/auth/profile/'); setUser(p.data)
        }catch(e){}
        try{
          const f = await api.get('/auth/friends/')
          const ids = (f.data || []).map((x:any)=> x.id)
          setFriendIds(ids)
        }catch(e){}
      }catch(err){console.error(err)}
      setLoading(false)
    }
    load()
  },[])

  const onCreate = (post:any)=>{
    const mapped = {
      id: post.id,
      author_name: post.author_name,
      author_avatar: post.author_avatar,
      time: post.time || 'Just now',
      text: post.text,
      image: post.image,
    }
    // add to friends list if author is friend or is current user
    const isFriend = friendIds.includes(post.author) || (user && post.author === user.id)
    if (isFriend) setFriendsPosts(p=>[mapped, ...p])
    else setOtherPosts(p=>[mapped, ...p])
  }

  const isPostFriend = (p:any)=>{
    if (!p) return false
    if (typeof p.author !== 'undefined') return friendIds.includes(p.author)
    // if backend supplied a flag
    return !!p.isFriend
  }

  // build paired rows of friend vs other posts
  const pairedRows = () =>{
    const maxLen = Math.max(friendsPosts.length, otherPosts.length)
    const rows:any[] = []
    for(let i=0;i<maxLen;i++){
      rows.push({left: friendsPosts[i] || null, right: otherPosts[i] || null})
    }
    return rows
  }

  return (
    <div className="max-w-7xl mx-auto mt-6 px-4 pt-16">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-3">Feed</h3>
          {friendsPosts.length===0 && otherPosts.length===0 && !loading ? (
            <div className="text-sm text-gray-500">No posts yet</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...friendsPosts, ...otherPosts].map((p:any)=> (
                <div key={p.id} className="w-full">
                  <PostCard post={p} isFriend={friendIds.includes(p.author) || !!p.isFriend} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
