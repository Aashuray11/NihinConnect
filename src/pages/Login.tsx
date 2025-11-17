import React, { useState } from 'react'
import { api } from '../services/api'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import logoCompact from '../assets/logo-compact.svg'

export default function Login(){
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [otpMode, setOtpMode] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpDigits, setOtpDigits] = useState<string[]>(['','','','','',''])
  const [timer, setTimer] = useState(0)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)
  const auth = useAuth()
  const nav = useNavigate()

  const [registerLoading, setRegisterLoading] = useState(false)

  const handleRegister = async (e:React.FormEvent) =>{
    e.preventDefault()
    setRegisterLoading(true)
    try{
      const resp = await api.post('/auth/register/', { name, email, password })
      const { access, refresh } = resp.data
      // auto-login after register
      await auth.login(access, refresh)
      setShowRegister(false)
      setPassword('')
      nav('/feed')
    }catch(err:any){
      alert('Register failed: '+ (err.response?.data?.message || err.message))
    }finally{ setRegisterLoading(false) }
  }

  const submit = async (e:React.FormEvent) =>{
    e.preventDefault()
    setLoading(true)
    try{
      const resp = await api.post('/auth/login/', { email, password })
      const { access, refresh } = resp.data
      await auth.login(access, refresh)
      nav('/feed')
    }catch(err:any){
      alert('Login failed: '+ (err.response?.data?.message || err.message))
    }finally{setLoading(false)}
  }

  const sendOtp = async ()=>{
    if(!email){ alert('Please enter your email first'); return }
    setSendingOtp(true)
    try{
      await api.post('/auth/login/', { email })
      setOtpSent(true)
      setOtpMode(true)
      setTimer(30);
      // try to fetch latest OTP from dev endpoint and autofill (poll for ~5s)
      (async function pollOtp(){
        for(let i=0;i<10;i++){
          try{
            const r = await api.get('/auth/dev/latest-otp/', { params: { email } })
            const code = r.data.code
            if(code && code.length===6){
              // sequentially fill digits to mimic typing
              setAutoFilling(true)
              const digits = code.split('')
              for(let j=0;j<digits.length;j++){
                setOtpDigits(d=>{
                  const next = [...d]
                  next[j] = digits[j]
                  return next
                })
                // small per-digit delay to feel natural
                await new Promise(res=>setTimeout(res, 250))
              }
              setAutoFilling(false)
              break
            }
          }catch(err){ /* ignore and retry */ }
          await new Promise(res=>setTimeout(res, 500))
        }
      })()
    }catch(err:any){
      alert('OTP send failed: '+ (err.response?.data?.message || err.message))
    }finally{ setSendingOtp(false) }
  }

  // timer effect for countdown
  React.useEffect(()=>{
    if(timer<=0) return
    const id = setInterval(()=>{
      setTimer(t=>{
        if(t<=1){ clearInterval(id); return 0 }
        return t-1
      })
    },1000)
    return ()=> clearInterval(id)
  },[timer])

  // focus first OTP input when sent
  React.useEffect(()=>{
    if(otpSent){
      const el = document.getElementById('otp-0') as HTMLInputElement | null
      if(el) el.focus()
    }
  },[otpSent])

  const handleOtpChange = (index:number, val:string) =>{
    if(!/^[0-9]?$/.test(val)) return
    setOtpDigits(d=>{
      const next = [...d]
      next[index] = val
      return next
    })
    // auto focus next
    if(val){
      const nextEl = document.getElementById(`otp-${index+1}`) as HTMLInputElement | null
      if(nextEl) nextEl.focus()
    }
  }

  const handleOtpKeyDown = (e:React.KeyboardEvent<HTMLInputElement>, index:number) =>{
    const target = e.target as HTMLInputElement
    if(e.key === 'Backspace' && !target.value){
      const prev = document.getElementById(`otp-${index-1}`) as HTMLInputElement | null
      if(prev) prev.focus()
    }
  }

  const submitOtp = async ()=>{
    const code = otpDigits.join('')
    if(code.length!==6){ alert('Enter 6-digit code'); return }
    setVerifyingOtp(true)
    try{
      const resp = await api.post('/auth/verify-otp/', { email, code })
      const { access, refresh } = resp.data
      await auth.login(access, refresh)
      nav('/feed')
    }catch(err:any){
      alert('OTP verify failed: '+(err.response?.data?.message || err.message))
    }finally{ setVerifyingOtp(false) }
  }

  const resendOtp = async ()=>{
    if(timer>0) return
    await sendOtp()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center px-6">
        {/* Left hero */}
        <div className="hidden md:flex flex-col items-start justify-center pl-12">
          <h1 className="text-5xl font-extrabold text-blue-600 mb-4">NihinConnect</h1>
          <p className="text-xl text-gray-700">NihinConnect helps you connect and share with the people in your life.</p>
        </div>

        {/* Right card - login form */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
            {/* small-screen hero: show app name and animated slogan on small viewports */}
            <div className="md:hidden text-center mb-4">
              <img src={logoCompact} alt="Nihin Connect" className="mx-auto w-12 h-12 mb-2" />
              <h2 className="text-2xl font-extrabold text-blue-600">NihinConnect</h2>
              <p className="text-sm text-gray-600 mt-1 max-w-xs mx-auto">
                NihinConnect helps you connect and share with the people in your life.
              </p>
            </div>
            {showRegister ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <h2 className="text-2xl font-bold">Create account</h2>
                <input id="register-name" name="name" className="w-full p-3 border rounded" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
                <input id="register-email" name="email" className="w-full p-3 border rounded" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} />
                <input id="register-password" name="password" className="w-full p-3 border rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
                <div className="flex flex-col gap-3">
                  <button type="submit" className="w-full bg-green-500 text-white py-3 rounded font-semibold">{registerLoading ? 'Creating...' : 'Create account'}</button>
                  <button type="button" onClick={()=>{ setShowRegister(false); setPassword(''); setOtpMode(false); setOtpSent(false); setOtpDigits(['','','','','','']); }} className="text-center text-sm text-blue-600 underline">Already have an account? Log in</button>
                </div>
              </form>
            ) : (
              <form onSubmit={submit} className="space-y-4">
              {/* When in OTP mode we hide the password and primary login button; show OTP action controls below instead */}
              {!otpMode && (
                <>
                  <input id="login-email" name="email" className="w-full p-3 border rounded" placeholder="Email address or phone number" value={email} onChange={e=>setEmail(e.target.value)} />
                  <input id="login-password" name="password" className="w-full p-3 border rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
                  <div className="flex flex-col gap-3">
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded font-semibold">{loading ? 'Logging in...' : 'Log in'}</button>
                    <div className="flex items-center justify-between text-sm">
                      <button type="button" onClick={()=>{ setOtpMode(true); setOtpSent(false); setOtpDigits(['','','','','','']); }} className="text-blue-600 underline">Login with OTP</button>
                      <button type="button" onClick={() => { setOtpMode(true); setOtpSent(false); setOtpDigits(['','','','','','']); sendOtp(); }} className="text-blue-600 underline">Forgotten password?</button>
                    </div>
                  </div>
                </>
              )}

              {/* If otpMode is active we don't show the password/login button here; the OTP UI below handles actions */}
              </form>
            )}

            {otpMode && (
              <div className="mt-4">
                {!otpSent ? (
                  <div className="space-y-3">
                      <div className="text-sm">Enter your email and click Send OTP</div>
                      <input id="otp-email" name="email" className="w-full p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={sendOtp} disabled={sendingOtp} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded">{sendingOtp? 'Sending...':'Send OTP'}</button>
                        <button onClick={() => { setOtpMode(false); setOtpSent(false); setOtpDigits(['','','','','','']); }} className="px-3 py-2 border rounded">Login with email</button>
                      </div>
                    </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm">Enter the 6-digit code sent to <strong>{email}</strong></div>
                    <div className="flex gap-2 justify-center">
                      {otpDigits.map((d,i)=> (
                        <input id={`otp-${i}`} key={i} value={d} onChange={e=>handleOtpChange(i,e.target.value)} onKeyDown={e=>handleOtpKeyDown(e,i)} maxLength={1} className={`w-10 h-10 text-center border rounded ${autoFilling ? 'animate-pulse bg-gray-100' : ''}`} />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">{timer>0 ? `Resend in ${timer}s` : 'You can resend the code'}</div>
                      <div className="flex gap-2">
                        <button onClick={submitOtp} disabled={verifyingOtp} className="px-3 py-1 bg-blue-600 text-white rounded">{verifyingOtp? 'Verifying...':'Verify OTP'}</button>
                        <button onClick={resendOtp} disabled={timer>0} className="px-3 py-1 border rounded">Resend</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!showRegister && (
              <div className="mt-6 border-t pt-6">
                <button onClick={()=>{ setShowRegister(true); setOtpMode(false); setOtpSent(false); setOtpDigits(['','','','','','']); setPassword(''); }} className="inline-block w-full text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded">Create new account</button>
              </div>
            )}
            <div className="mt-4 text-center text-xs text-gray-400">Create a Page for a celebrity, brand or business.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
