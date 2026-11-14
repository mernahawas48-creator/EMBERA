import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { platforms, type Point, type Region } from './api'

export function AtlasMap({ regions, selected, points, onRegion }: {
  regions: Region[]; selected: Region | undefined; points: Point[]; onRegion: (id: string) => void
}) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const select = useRef(onRegion)
  select.current = onRegion
  useEffect(() => {
    if (!element.current) return
    const bounds: L.LatLngBoundsExpression = [[-90, -180], [90, 180]]
    const atlas = L.map(element.current, {
      crs: L.CRS.EPSG4326, minZoom: 0, maxZoom: 8, zoomSnap: .25, preferCanvas: true,
      scrollWheelZoom: false, maxBounds: [[-100, -216], [100, 216]], attributionControl: true,
    })
    atlas.attributionControl.setPrefix(false)
    L.imageOverlay('/earth-map.webp', bounds, {
      attribution: '<a href="https://svs.gsfc.nasa.gov/30876/">NASA GSFC · Black Marble 2016</a>',
      alt: 'NASA Black Marble nighttime imagery, used as a basemap',
    }).addTo(atlas)
    atlas.fitBounds(bounds)
    map.current = atlas
    const resize = new ResizeObserver(() => atlas.invalidateSize())
    resize.observe(element.current)
    return () => { resize.disconnect(); atlas.remove(); map.current = null }
  }, [])
  useEffect(() => {
    const atlas = map.current
    if (!atlas) return
    const outlines = L.layerGroup().addTo(atlas)
    regions.filter(r => r.id !== 'world').forEach(region => {
      const [w, s, e, n] = region.bounds
      L.rectangle([[s, w], [n, e]], {
        weight: 1, color: selected?.id === region.id ? '#ee8953' : '#ad886d',
        opacity: .8, fillOpacity: .07, dashArray: '4 4', bubblingMouseEvents: false,
      }).bindTooltip(region.name).on('click', () => select.current(region.id)).addTo(outlines)
    })
    if (selected) {
      const [w, s, e, n] = selected.bounds
      atlas.fitBounds([[s, w], [n, e]], { padding: [10, 10], animate: false })
    }
    return () => { outlines.remove() }
  }, [regions, selected])
  useEffect(() => {
    const atlas = map.current
    if (!atlas) return
    const layer = L.layerGroup().addTo(atlas)
    points.forEach(point => {
      const label = document.createElement('span')
      label.textContent = `${platforms[point.platform]} · ${point.utc} · ${point.latitude.toFixed(3)}, ${point.longitude.toFixed(3)}${point.weight == null ? '' : ' · ' + point.weight.toLocaleString() + ' detections in grid cell'}`
      L.circleMarker([point.latitude, point.longitude], {
        radius: point.weight == null ? 2.8 : Math.min(12, 2 + Math.log1p(point.weight) * .8), fillColor: point.sensor === 'MODIS' ? '#ff9c5c' : '#e8ce82',
        fillOpacity: .78, stroke: false,
      }).bindPopup(label).addTo(layer)
    })
    return () => { layer.remove() }
  }, [points])
  return <div ref={element} className="atlas-map" role="region" aria-label="Interactive satellite hotspot map" />
}
