import React, { useRef, useState } from 'react'
import Avatar from './Avatar'
import { api } from '../services/api'

export default function CreatePost({onCreate}:{onCreate?: (post:any)=>void}){
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [postToHome, setPostToHome] = useState(true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const maxChars = 1000

  const onDropFile = (f:File) =>{
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
  }

  const onChooseFile = (e:React.ChangeEvent<HTMLInputElement>)=>{
    const f = e.target.files && e.target.files[0]
    if(f) onDropFile(f)
  }

  const removeImage = ()=>{
    if(imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    if(fileInputRef.current) fileInputRef.current.value = ''
  }

  const addTag = ()=>{
    const t = tagInput.trim()
    if(!t) return
    if(!tags.includes(t)) setTags(s=>[...s, t])
    setTagInput('')
  }

  const removeTag = (t:string)=> setTags(s=>s.filter(x=>x!==t))

  const onDrop = (e: React.DragEvent) =>{
    e.preventDefault()
    const f = e.dataTransfer.files && e.dataTransfer.files[0]
    if(f) onDropFile(f)
  }

  const onDragOver = (e:React.DragEvent)=> e.preventDefault()

  const submit = async (e:React.FormEvent) =>{
    e.preventDefault()
    if(!text.trim() && !imageFile) return alert('Please add some text or an image')
    setLoading(true)
    try{
      const fd = new FormData()
      fd.append('text', text)
      if(imageFile) fd.append('image', imageFile)
      // tags and postToHome are frontend-only enhancements for now; send as metadata
      if(tags.length) fd.append('tags', JSON.stringify(tags))
      fd.append('post_to_home', postToHome ? '1' : '0')

      const resp = await api.post('/posts/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const post = resp.data
      // clear form
      setText('')
      removeImage()
      setTags([])
      onCreate?.(post)
    }catch(err){ console.error(err); alert('Failed to create post') }
    finally{ setLoading(false) }
  }

  return (
    <div className="bg-white shadow rounded p-4">
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-shrink-0 mb-3 sm:mb-0">
          <Avatar />
        </div>
        <div className="flex-1">
          <textarea
            id="createpost-text"
            name="text"
            value={text}
            onChange={e=> setText(e.target.value.slice(0, maxChars))}
            placeholder="What's on your mind?"
            className="w-full border rounded p-2 min-h-[96px] resize-none"
          />

          {/* image dropzone + preview */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className={`mt-3 p-3 border-dashed rounded ${imagePreview ? 'border-0' : 'border'} bg-gray-50 flex flex-col sm:flex-row items-center sm:items-start gap-3`}
          >
            {!imagePreview ? (
              <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
                <div className="text-sm text-gray-600">Drag & drop an image here or</div>
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} id="createpost-image" name="image" type="file" accept="image/*" onChange={onChooseFile} className="hidden" />
                  <button type="button" onClick={()=>fileInputRef.current?.click()} className="px-3 py-1 bg-white border rounded">Choose Photo</button>
                </div>
              </div>
            ) : (
                <div className="relative w-full">
                  <div className="h-48 sm:h-64 w-full overflow-hidden rounded">
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-black/60 text-white rounded px-2 py-1">Remove</button>
                </div>
            )}
          </div>

          {/* tags */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2 items-stretch">
            <input id="createpost-tag" name="tag" value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addTag() } }} placeholder="Add tag and press Enter" className="px-2 py-1 border rounded flex-1" />
            <button type="button" onClick={addTag} className="px-3 py-1 bg-white border rounded w-full sm:w-auto">Add</button>
          </div>
          <div className="mt-2 flex gap-2 flex-wrap">
            {tags.map(t=> (
              <div key={t} className="bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-2 text-sm">
                <span>{t}</span>
                <button type="button" onClick={()=>removeTag(t)} className="text-blue-600">×</button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col sm:flex-row items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={postToHome} onChange={e=>setPostToHome(e.target.checked)} />
                <span>Post to homepage</span>
              </label>
              <div className="text-sm text-gray-500">{text.length}/{maxChars}</div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
              <button type="button" onClick={()=>{ setText(''); removeImage(); setTags([]) }} className="px-3 py-1 rounded border w-full sm:w-auto">Clear</button>
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded w-full sm:w-auto text-center">{loading ? 'Posting...' : 'Post'}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
