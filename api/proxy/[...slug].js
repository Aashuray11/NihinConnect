module.exports = async (req, res) => {
  try {
    // slug can be an array when using [...slug].js
    const slug = Array.isArray(req.query?.slug) ? req.query.slug.join('/') : (req.query?.slug || '')
    const targetBase = (process.env.VITE_API_URL || 'https://ahmad-prosurgical-stuart.ngrok-free.dev').replace(/\/+$|\s+/g, '')
    const url = `${targetBase}/${slug}`.replace(/([^:]\/)\/+/g, '$1')

    // Build headers to forward; remove host and add ngrok skip header
    const headers = { ...req.headers, 'ngrok-skip-browser-warning': '1' }
    delete headers.host

    // Read raw body (works for multipart/form-data file uploads)
    const getRawBody = () =>
      new Promise((resolve, reject) => {
        const chunks = []
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        req.on('end', () => resolve(Buffer.concat(chunks)))
        req.on('error', (err) => reject(err))
      })

    let body
    if (!['GET', 'HEAD'].includes(req.method)) {
      body = await getRawBody()
      if (body.length === 0) body = undefined
    }

    // Forward request to ngrok target
    const fetchRes = await fetch(url, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    })

    // Forward status and headers (avoid some hop-by-hop headers)
    const skipHeaders = new Set([
      'transfer-encoding', 'content-encoding', 'connection', 'keep-alive',
      'proxy-authenticate', 'proxy-authorization', 'te', 'trailers',
      'upgrade'
    ])
    fetchRes.headers.forEach((val, key) => {
      if (!skipHeaders.has(key.toLowerCase())) res.setHeader(key, val)
    })

    // Ensure CORS from Vercel front-end to proxy works
    res.setHeader('Access-Control-Allow-Origin', '*')

    const arrayBuf = await fetchRes.arrayBuffer()
    res.status(fetchRes.status).end(Buffer.from(arrayBuf))
  } catch (err) {
    console.error('proxy error', err)
    res.status(500).json({ error: 'proxy error' })
  }
}
