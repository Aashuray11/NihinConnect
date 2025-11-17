import React, { useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

export default function OTPVerify(){
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const auth = useAuth()
  const nav = useNavigate()

  const submit = async (e:React.FormEvent) =>{
    e.preventDefault()
    setLoading(true)
    try{
      const resp = await api.post('/auth/verify-otp/', { email, code })
      const { access, refresh } = resp.data
      await auth.login(access, refresh)
      nav('/feed')
    }catch(err:any){
      alert('OTP verify failed: '+ (err.response?.data?.message || err.message))
    }finally{setLoading(false)}
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Verify OTP</h2>
      <form onSubmit={submit} className="space-y-3">
        <input id="otpverify-email" name="email" className="w-full p-2 border" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input id="otpverify-code" name="code" className="w-full p-2 border" placeholder="OTP Code" value={code} onChange={e=>setCode(e.target.value)} />
        <div className="flex justify-end">
          <Button>{loading ? '...' : 'Verify'}</Button>
        </div>
      </form>
    </div>
  )
}
