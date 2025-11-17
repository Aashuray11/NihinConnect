import React from 'react'

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
  /** center text/content inside the card */
  center?: boolean
  /** constrain card width and center it on larger screens */
  constrained?: boolean
}

export default function Card({ children, className, center = false, constrained = false, ...rest }: Props){
  const containerClass = constrained ? 'w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto' : 'w-full'
  const contentAlign = center ? 'text-center' : 'text-left'

  return (
    <div className={containerClass}>
      <div {...rest} className={`relative bg-white shadow-sm rounded-lg p-4 sm:p-6 w-full ${contentAlign} ${className || ''} overflow-hidden`}>
        {children}
      </div>
    </div>
  )
}
