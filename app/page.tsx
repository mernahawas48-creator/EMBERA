'use client'

import dynamic from 'next/dynamic'

const Atlas = dynamic(() => import('../src/main'), { ssr: false, loading: () => <main className="frame block">Loading EMBERA…</main> })

export default function Page() {
  return <Atlas />
}
