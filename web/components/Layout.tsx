import React from 'react'

type Props = { children: React.ReactNode }

export default function Layout({ children }: Props) {
  return (
    <div className="layout">
      <nav className="nav">Glass Rose</nav>
      <div className="content">{children}</div>
      <footer className="footer">© Glass Rose</footer>
    </div>
  )
}
