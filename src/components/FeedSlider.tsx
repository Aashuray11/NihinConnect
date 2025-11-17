import React, { useRef, useState } from 'react'
import CompactPost from './CompactPost'

export default function FeedSlider({friends, others, onOpen}:{friends:any[], others:any[], onOpen:(p:any)=>void}){
  const [tab, setTab] = useState<'friends'|'others'>('friends')
  const sc = useRef<HTMLDivElement|null>(null)

  const items = tab === 'friends' ? friends : others

  const scrollBy = (dir: 'left'|'right')=>{
    if(!sc.current) return
    const w = sc.current.clientWidth
    sc.current.scrollBy({left: dir==='left' ? -w : w, behavior: 'smooth'})
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button onClick={()=>setTab('friends')} className={`px-3 py-1 rounded ${tab==='friends' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3zM8 13c-2.67 0-8 1.337-8 4v2h10.081A6.978 6.978 0 0 1 8 13zm8 0c-.29 0-.576.014-.86.042A6.98 6.98 0 0 1 24 19v2h-8c0-2.663-5.33-4-8-4 1.684 0 3.915-.39 5.52-1.042C11.66 14.45 12.796 13 16 13z"/></svg>
            Friends
          </button>
          <button onClick={()=>setTab('others')} className={`px-3 py-1 rounded ${tab==='others' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 17.93V20h-2v-.07A8.001 8.001 0 0 1 4.07 13H4v-2h.07A8.001 8.001 0 0 1 11 4.07V4h2v.07A8.001 8.001 0 0 1 19.93 11H20v2h-.07A8.001 8.001 0 0 1 13 19.93z"/></svg>
            Others
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>scrollBy('left')} className="px-2 py-1 bg-white rounded shadow">◀</button>
          <button onClick={()=>scrollBy('right')} className="px-2 py-1 bg-white rounded shadow">▶</button>
        </div>
      </div>

      <div ref={sc} className="flex gap-2 overflow-x-auto py-2">
        {items && items.length>0 ? items.map((p)=> (
          <div key={p.id} className="flex-shrink-0 w-[32%]">
            <CompactPost post={p} isFriend={tab==='friends'} onOpen={()=>onOpen && onOpen(p)} />
          </div>
        )) : (
          <div className="text-sm text-gray-500 px-2">No posts in this tab</div>
        )}
      </div>
    </div>
  )
}
