// Use Vite env var `VITE_API_URL` so deployed sites (Vercel) can point to the
// ngrok-exposed backend without modifying source. Fallback to the current
// ngrok URL for local development.
const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) || ''

// When deployed on Vercel we want the frontend to call the same origin
// (relative URLs) so that the serverless proxy handles requests to the
// ngrok backend. Detect Vercel at runtime and switch to a relative base.
let _base = envUrl || 'https://ahmad-prosurgical-stuart.ngrok-free.dev'
try{
	if (typeof window !== 'undefined' && window.location && typeof window.location.hostname === 'string'){
		const host = window.location.hostname
		if (host.endsWith('.vercel.app') || host === 'vercel.app') {
			_base = ''
		}
	}
}catch(e){/* ignore */}

export const BASE_URL = _base
