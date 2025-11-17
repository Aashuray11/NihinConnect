import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import Avatar from '../components/Avatar'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'

export default function Friends(){
  const [incoming, setIncoming] = useState<any[]>([])
  const [friends, setFriends] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const auth = useAuth()
  const navigate = useNavigate()

  const load = async ()=>{
    try{
      const r1 = await api.get('/auth/friend-requests/')
      setIncoming(r1.data.requests||[])
      const r2 = await api.get('/auth/friends/')
      setFriends(r2.data.friends||[])
      const r3 = await api.get('/auth/users/all/')
      // exclude current friends and incoming requests from the Discover list
      const friendsIds = (r2.data.friends||[]).map((f:any)=>f.id)
      const incomingSenderIds = (r1.data.requests||[]).map((rq:any)=>rq.sender?.id).filter(Boolean)
      const others = (r3.data.users||[]).filter((u:any)=> !friendsIds.includes(u.id) && !incomingSenderIds.includes(u.id))
      setAllUsers(others)
    }catch(err){console.error(err)}
  }

  useEffect(()=>{load()},[])

  // send functionality removed from this view (use search/user cards to send requests)

  const respond = async (id:number, action:'accept'|'reject')=>{
    try{
      await api.post(`/auth/friend-requests/${id}/respond/`, { action })
      load()
    }catch(err:any){alert('Action failed: '+(err.response?.data?.message||err.message))}
  }

  const sendRequest = async (userId:number)=>{
    try{
      await api.post('/auth/friend-requests/send/', { receiver_id: userId })
      load()
    }catch(err:any){alert('Send failed: '+(err.response?.data?.message||err.message))}
  }

  const cancelRequest = async (requestId:number|null|undefined)=>{
    if(!requestId) return
    try{
      await api.post(`/auth/friend-requests/${requestId}/cancel/`)
      load()
    }catch(err:any){alert('Cancel failed: '+(err.response?.data?.message||err.message))}
  }

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Friends</h2>
      {/* send-by-email removed: use user cards/search to send requests */}
      <div className="mb-6">
        <h3 className="font-semibold">Incoming Friend Requests</h3>
        {incoming.length===0 ? <div className="text-sm text-gray-500">No requests</div> : incoming.map(r=> (
          <div key={r.id} className="p-2 flex items-center justify-between border rounded mb-2">
            <div className="flex items-center gap-3">
              <Avatar src={r.sender.avatar} size={40} />
              <div className="font-medium">{r.sender.name}</div>
            </div>
            <div className="flex gap-2">
              <Button onClick={()=>respond(r.id,'accept')}>Accept</Button>
              <Button onClick={()=>respond(r.id,'reject')}>Decline</Button>
            </div>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-semibold">Connections</h3>
        {friends.length===0 ? <div className="text-sm text-gray-500">No connections</div> : friends.map(f=> (
            <div key={f.id} className="p-3 border rounded mb-2 flex items-center gap-3 cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/profile?id=${f.id}`)}>
            <div className="flex items-center gap-3 flex-1">
              <Avatar src={f.avatar} size={48} />
              <div className="flex-1">
                <div className="font-medium">{f.name}</div>
                {f.bio && <div className="text-xs text-gray-600">{f.bio}</div>}
                <div className="text-xs text-gray-500">{f.location || f.phone || ''}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="my-6">
        <h3 className="font-semibold">Discover People</h3>
        {allUsers.length===0 ? <div className="text-sm text-gray-500">No other users</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {allUsers.map(u=> (
              <div key={u.id} className="p-3 border rounded flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => navigate(`/profile?id=${u.id}`)}>
                  <Avatar src={u.avatar} size={48} />
                  <div>
                    <div className="font-medium">{u.name}</div>
                    {u.bio && <div className="text-xs text-gray-600">{u.bio}</div>}
                    <div className="text-xs text-gray-500">{u.request_sent ? 'Request sent' : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {u.request_sent ? (
                    <Button onClick={()=>cancelRequest(u.request_sent_id)}>Cancel</Button>
                  ) : (
                    <Button onClick={()=>sendRequest(u.id)}>Send Request</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
