import React from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'

export default function Footer(){
  return (
    <footer className="mt-8 bg-white border-t">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* improved compact inline logo for small screens */}
          <div className="w-8 h-8 md:hidden flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
              <rect width="24" height="24" rx="6" fill="#2563EB" />
              <path d="M7 12c1.5-2 3.5-3 5-3s3.5 1 5 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="8" r="1.2" fill="#fff" />
            </svg>
          </div>

          <img src={logo} alt="Nihin Connect" className="hidden md:inline-block w-20 h-auto" />
          <div className="hidden md:block text-sm text-gray-600">Connecting friends and communities</div>
        </div>

        <nav className="flex items-center gap-4">
          <Link to="/about" className="text-sm text-gray-600 hover:text-gray-900">About</Link>
          <Link to="/groups" className="text-sm text-gray-600 hover:text-gray-900">Groups</Link>
          <Link to="/privacy" className="text-sm text-gray-600 hover:text-gray-900">Privacy</Link>
          <Link to="/contact" className="text-sm text-gray-600 hover:text-gray-900">Contact</Link>
        </nav>

        <div className="text-sm text-gray-500 text-center md:text-right flex flex-col items-center md:items-end gap-1">
          <div className="hidden sm:block">© {new Date().getFullYear()} Nihin Connect</div>
          <div className="text-xs">Built with ❤️</div>
          <div className="mt-2 text-xs text-gray-600">Dev: <a href="https://www.linkedin.com/in/aashu-kumar-rajbhar" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Aashu Kumar Rajbhar</a></div>

          <div className="flex items-center gap-3 mt-2">
            <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-gray-500 hover:text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 5 3.88 6.1 2.38 6.1S-.22 5 .78 3.5 3.08.9 4.58.9s.4 1.6.4 2.6zM.5 8.5h4.96V24H.5zM9 8.5h4.76v2.15h.07c.66-1.25 2.28-2.56 4.7-2.56C23.33 8.09 24 11.06 24 14.92V24H19V15.9c0-2.12-.04-4.84-2.95-4.84-2.96 0-3.41 2.31-3.41 4.7V24H9z"/></svg>
            </a>

            <a href="https://github.com/" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-gray-500 hover:text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.57.11.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.38-3.88-1.38-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.72-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.02 11.02 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.35.77 1.04.77 2.1 0 1.52-.01 2.75-.01 3.12 0 .3.2.66.79.55C20.71 21.38 24 17.08 24 12c0-6.35-5.15-11.5-12-11.5z"/></svg>
            </a>

            <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-gray-500 hover:text-sky-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.56c-.88.39-1.82.65-2.8.77a4.92 4.92 0 0 0 2.16-2.72 9.86 9.86 0 0 1-3.13 1.2 4.92 4.92 0 0 0-8.38 4.48A13.97 13.97 0 0 1 1.67 3.15 4.92 4.92 0 0 0 3.2 9.72a4.9 4.9 0 0 1-2.23-.62v.06a4.92 4.92 0 0 0 3.95 4.82 4.9 4.9 0 0 1-2.22.08 4.92 4.92 0 0 0 4.6 3.42A9.86 9.86 0 0 1 0 19.54 13.94 13.94 0 0 0 7.56 22c9.05 0 14-7.5 14-14v-.64A9.98 9.98 0 0 0 24 4.56z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
