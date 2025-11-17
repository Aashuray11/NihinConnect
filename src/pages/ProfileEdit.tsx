import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import Button from '../components/Button'
import Avatar from '../components/Avatar'
import { useNavigate } from 'react-router-dom'

export default function ProfileEdit(){
  const auth = useAuth()
  const navigate = useNavigate()
  const user = auth.user
  const [name, setName] = useState(user?.name||'')
  const [bio, setBio] = useState((user as any)?.bio||'')
  const [school, setSchool] = useState((user as any)?.school||'')
  const [location, setLocation] = useState((user as any)?.location||'')
  const [email, setEmail] = useState(user?.email||'')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(()=>{
    return ()=>{ if (previewUrl) URL.revokeObjectURL(previewUrl) }
  },[previewUrl])

  const onFileChange = (f:File | null)=>{
    setAvatarFile(f)
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    if (f) setPreviewUrl(URL.createObjectURL(f))
  }

  const save = async ()=>{
    setSaving(true)
    try{
      // If an avatar file is present, upload it via the dedicated endpoint first.
      // Some mobile browsers/clients have issues with PUT + multipart/form-data,
      // so using the POST `/auth/profile/avatar/` endpoint is more reliable.
      let profileResp: any = null
      if (avatarFile) {
        const f = new FormData()
        f.append('avatar', avatarFile)
        try{
          const r = await api.post('/auth/profile/avatar/', f)
          profileResp = r.data?.profile || r.data
        }catch(e:any){
          // continue — we still attempt to save other fields
          console.warn('Avatar upload failed', e?.response?.data || e.message)
        }
      }

      // Update textual profile fields (name, bio, school, location)
      const form = new FormData()
      form.append('name', name)
      form.append('bio', bio)
      form.append('school', school)
      form.append('location', location)
      const resp = await api.put('/auth/profile/', form)
      // Prefer the profile returned from the PUT, but fall back to avatar upload result
      const finalProfile = resp.data || profileResp
      auth.setUser(finalProfile)
      localStorage.setItem('nihiconnect_user', JSON.stringify(finalProfile))
      navigate('/profile')
    }catch(err:any){
      alert('Save failed: '+ (err.response?.data || err.message))
    }finally{ setSaving(false) }
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 bg-white rounded shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="flex flex-col items-center">
            <Avatar src={previewUrl ?? user?.avatar} size={120} />
            <input type="file" accept="image/*" onChange={e=>onFileChange(e.target.files?.[0]||null)} className="mt-3" />
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="space-y-3">
            <div>
              <label className="block text-sm">Name</label>
              <input className="w-full p-2 border" value={name} onChange={e=>setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Bio</label>
              <textarea className="w-full p-2 border" rows={4} value={bio} onChange={e=>setBio(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">School</label>
                <input className="w-full p-2 border" value={school} onChange={e=>setSchool(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm">Location</label>
                <input className="w-full p-2 border" value={location} onChange={e=>setLocation(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={save}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
