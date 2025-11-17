// Use Vite env var `VITE_API_URL` so deployed sites (Vercel) can point to the
// ngrok-exposed backend without modifying source. Fallback to an empty string.
const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) || ''

// Development: point to local backend (or envUrl if provided).
// Production: use relative `/api` so the Vercel serverless proxy handles forwarding.
let _base = ''
try {
	// Vite exposes import.meta.env.DEV in dev mode
	const isDev = typeof import.meta !== 'undefined' && !!((import.meta as any).env && (import.meta as any).env.DEV)
	if (isDev) {
		// prefer explicit VITE_API_URL in .env; otherwise default to local Django
		_base = envUrl || 'http://localhost:8000'
	} else {
		// deployed apps should use the proxy on the same origin
		_base = '/api'
	}
} catch (e) {
	_base = envUrl || '/api'
}

export const BASE_URL = _base
