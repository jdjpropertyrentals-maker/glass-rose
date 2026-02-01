import { useEffect, useState } from 'react'

export default function KycPage(){
  const [items, setItems] = useState([])
  useEffect(()=>{
    // TODO: call backend admin API to fetch pending KYC entries
    setItems([ {id:'demo-1', user:'user@example.com', status:'pending'} ])
  },[])
  return (
    <div style={{padding:24}}>
      <h2>KYC Review</h2>
      <table>
        <thead><tr><th>ID</th><th>User</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {items.map((it:any)=>(
            <tr key={it.id}><td>{it.id}</td><td>{it.user}</td><td>{it.status}</td><td><button>Approve</button> <button>Reject</button></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
