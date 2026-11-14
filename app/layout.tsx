import type { ReactNode } from 'react'
import 'leaflet/dist/leaflet.css'
import '../src/styles.css'

export const metadata = {
  title: 'EMBERA — The Fire Memory Atlas',
  description: 'Explore MODIS and VIIRS fire activity across time.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
