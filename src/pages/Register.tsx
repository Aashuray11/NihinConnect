import React, { useState } from 'react'
import { api } from '../services/api'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

export default function Register(){
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const submit = async (e:React.FormEvent) =>{
    e.preventDefault()
    setLoading(true)
    try{
      const resp = await api.post('/auth/register/', {name, email, password})
      // login flow - backend returns access & refresh
      const { access, refresh } = resp.data
      // store and fetch profile handled at AuthContext login if used; for now navigate to login
      alert('Registered. Please login.')
      nav('/login')
    }catch(err:any){
      alert('Register failed: '+ (err.response?.data?.message || err.message))
    }finally{setLoading(false)}
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      <form onSubmit={submit} className="space-y-3">
        <input id="register-name" name="name" className="w-full p-2 border" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input id="register-email" name="email" className="w-full p-2 border" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input id="register-password" name="password" className="w-full p-2 border" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <div className="flex justify-end">
          <Button>{loading ? '...' : 'Register'}</Button>
        </div>
      </form>
    </div>
  )
}
