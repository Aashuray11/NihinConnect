module.exports = (req, res) => {
  // Basic CORS headers for cross-origin requests
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return res.status(204).end()
  }

  // Return a small JSON payload so the function responds correctly
  return res.status(200).json({
    ok: true,
    path: req.url || '/',
    note: 'repo-root ping',
    timestamp: new Date().toISOString(),
  })
}
