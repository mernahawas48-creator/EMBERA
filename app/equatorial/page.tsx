'use client'
import dynamic from 'next/dynamic'
const Intelligence = dynamic(() => import('../../src/Equatorial'), { ssr: false })
export default function Page() { return <Intelligence /> }
