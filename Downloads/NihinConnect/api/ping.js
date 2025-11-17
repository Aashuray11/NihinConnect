module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).json({ ok: true, path: req.url, note: 'repo-root ping' })
}
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).json({ ok: true, message: 'proxy root is active' })
}
