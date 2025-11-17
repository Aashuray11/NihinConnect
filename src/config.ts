// Use Vite env var `VITE_API_URL` so deployed sites (Vercel) can point to the
// ngrok-exposed backend without modifying source. Fallback to the current
// ngrok URL for local development.
const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) || ''
export const BASE_URL = envUrl || 'https://ahmad-prosurgical-stuart.ngrok-free.dev'
