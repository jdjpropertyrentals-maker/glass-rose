import Head from 'next/head'

export default function Home() {
  return (
    <div className="page-root">
      <Head>
        <title>Glass Rose</title>
        <meta name="description" content="Glass Rose — sweepstakes casino" />
      </Head>

      <main className="container">
        <header className="hero">
          <h1 className="title">Glass Rose</h1>
          <p className="subtitle">A delicate sweepstakes experience — play provably-fair slots.</p>
        </header>

        <section className="cta">
          <button className="btn-primary">Get Started</button>
        </section>

      </main>
    </div>
  )
}
