import React from 'react'

type Props = {
  children: React.ReactNode,
  onClick?: () => void,
  className?: string,
  responsive?: boolean
}

export default function Button({children, onClick, className, responsive}:{children:React.ReactNode, onClick?:()=>void, className?:string, responsive?:boolean}){
  // when `responsive` is true, button becomes full-width on small screens and auto on sm+
  const respClass = responsive ? 'w-full sm:w-auto block sm:inline-block' : ''
  return (
    <button onClick={onClick} className={`px-4 py-2 bg-blue-600 text-white rounded ${respClass} ${className||''}`}>
      {children}
    </button>
  )
}
