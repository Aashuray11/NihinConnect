// Use Vite env var `VITE_API_URL` so deployed sites (Vercel) can point to the
// ngrok-exposed backend without modifying source. Fallback to the current
// ngrok URL for local development.
const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) || ''

// When deployed on Vercel we want the frontend to call the same origin
// (relative URLs) so that the serverless proxy handles requests to the
// ngrok backend. Detect Vercel at runtime and switch to a relative base.
// Force base to '/api' for deployed site to ensure requests go to Vercel proxy.
// This is a temporary safety-net deployment fix — we can revert once routing
// /api/* through the proxy is confirmed working. It also avoids relying on
// runtime hostname detection which can be brittle across deploys.
let _base = '/api'
export const BASE_URL = _base
