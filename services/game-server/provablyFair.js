const crypto = require('crypto')

function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex')
}

function serverSeedHash(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex')
}

// derive a deterministic pseudo-random number using HMAC-SHA256
function hmacRandom(serverSeed, clientSeed, nonce) {
  const hmac = crypto.createHmac('sha256', serverSeed)
  hmac.update(`${clientSeed}:${nonce}`)
  const digest = hmac.digest()
  // return big integer from digest
  return BigInt('0x' + digest.toString('hex'))
}

// Simple slot logic: 3 reels, symbols list
const SYMBOLS = ['A', 'K', 'Q', 'J', '10', '7']
const PAYTABLE = {
  'A,A,A': 50,
  'K,K,K': 30,
  'Q,Q,Q': 20,
  'J,J,J': 10,
  '10,10,10': 5,
  '7,7,7': 100
}

function spinResult(serverSeed, clientSeed, nonce) {
  const rand = hmacRandom(serverSeed, clientSeed, nonce)
  // use rand to pick 3 symbols deterministically
  const s0 = SYMBOLS[Number(rand % BigInt(SYMBOLS.length))]
  const s1 = SYMBOLS[Number((rand / BigInt(100)) % BigInt(SYMBOLS.length))]
  const s2 = SYMBOLS[Number((rand / BigInt(10000)) % BigInt(SYMBOLS.length))]
  const symbols = [s0, s1, s2]
  const key = symbols.join(',')
  const multiplier = PAYTABLE[key] || 0
  return { symbols, multiplier }
}

module.exports = { generateServerSeed, serverSeedHash, spinResult }
