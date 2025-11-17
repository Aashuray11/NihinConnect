import React, { useState } from 'react'
import DefaultAvatar from '../assets/avatar-default.svg'

type AvatarProps = {
  src?: string | null
  size?: number
  className?: string
}

export default function Avatar({src, size=48, className=''}:AvatarProps){
  const [failed, setFailed] = useState(false)
  const placeholder = DefaultAvatar

  const showImage = !!src && !failed

  return (
    <div style={{width:size, height:size}} className={`rounded-full overflow-hidden bg-gray-200 ${className}`}>
      {showImage ? (
        // handle failed loads by switching to fallback
        <img
          src={src as string}
          alt="avatar"
          onError={() => setFailed(true)}
          style={{width:'100%',height:'100%',objectFit:'cover'}}
        />
      ) : (
        <img src={placeholder} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}} />
      )}
    </div>
  )
}
