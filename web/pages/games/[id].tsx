import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

export default function GamePage() {
  const router = useRouter()
  const { id } = router.query
  const [game, setGame] = useState<any>(null)
  const [clientSeed, setClientSeed] = useState('')
  const [stake, setStake] = useState(1)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/proxy/games')
      const data = await res.json()
      setGame(data.games?.find((g:any)=>g.id===id) || null)
      setClientSeed(Math.random().toString(36).slice(2))
    }
    if (id) load()
  }, [id])

  async function spin() {
    // In production use authenticated user ID and real API base
    const payload = { user_id: 'demo-user', stake, client_seed: clientSeed }
    const res = await fetch(`http://localhost:4200/v1/games/${id}/spin`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    setResult(data)
  }

  return (
    <div style={{padding:24}}>
      <h2>{game?.name || 'Loading...'}</h2>
      <div>
        <label>Client seed: <input value={clientSeed} onChange={(e)=>setClientSeed(e.target.value)} /></label>
      </div>
      <div>
        <label>Stake: <input type="number" value={stake} onChange={(e)=>setStake(Number(e.target.value))} /></label>
      </div>
      <button onClick={spin} style={{marginTop:12}}>Spin</button>

      {result && (
        <div style={{marginTop:20}}>
          <div>Symbols: {result.symbols.join(' ')}</div>
          <div>Multiplier: {result.multiplier}</div>
          <div>Payout: {result.payout}</div>
          <div>Server reveal: {result.server_seed_reveal?.slice(0,16)}...</div>
        </div>
      )}
    </div>
  )
}
