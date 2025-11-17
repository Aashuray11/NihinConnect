import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Register from '../pages/Register'
import Login from '../pages/Login'
import OTPVerify from '../pages/OTPVerify'
import Profile from '../pages/Profile'
import ProfileEdit from '../pages/ProfileEdit'
import Friends from '../pages/Friends'
import Messages from '../pages/Messages'
import Feed from '../pages/Feed'
import { useAuth } from '../context/AuthContext'

const PrivateRoute: React.FC<{children: JSX.Element}> = ({children}) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  return children
}

export default function AppRouter(){
  return (
    <Routes>
      <Route path="/register" element={<Register/>} />
      <Route path="/login" element={<Login/>} />
      <Route path="/otp-verify" element={<OTPVerify/>} />
      <Route path="/profile" element={<PrivateRoute><Profile/></PrivateRoute>} />
      <Route path="/profile/edit" element={<PrivateRoute><ProfileEdit/></PrivateRoute>} />
      <Route path="/friends" element={<PrivateRoute><Friends/></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Messages/></PrivateRoute>} />
      <Route path="/feed" element={<PrivateRoute><Feed/></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/feed" />} />
    </Routes>
  )
}
