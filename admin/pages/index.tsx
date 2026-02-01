import Link from 'next/link'

export default function AdminIndex(){
  return (
    <div style={{padding:24}}>
      <h1>Glass Rose — Admin</h1>
      <ul>
        <li><Link href="/kyc">KYC Review</Link></li>
        <li><Link href="/deposits">Deposits</Link></li>
        <li><Link href="/withdrawals">Withdrawals</Link></li>
        <li><Link href="/audit">Audit Logs</Link></li>
      </ul>
    </div>
  )
}
