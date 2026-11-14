import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { platforms, type Point, type Region } from './api'

export interface MapAlert { id: string; latitude: number; longitude: number; label: string; count: number }
export function AtlasMap({ regions, selected, points, onRegion, sync, alerts = [] }: {
  regions: Region[]; selected: Region | undefined; points: Point[]; onRegion: (id: string) => void
  sync?: { current: Set<L.Map>; updating?: boolean }; alerts?: MapAlert[]
}) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [imageryError, setImageryError] = useState(false)
  const select = useRef(onRegion)
  select.current = onRegion
  useEffect(() => {
    if (!element.current) return
    const atlas = L.map(element.current, {
      minZoom: 1, maxZoom: 8, zoomSnap: .25,
      scrollWheelZoom: true, maxBounds: [[-85, -180], [85, 180]], attributionControl: true,
    })
    atlas.attributionControl.setPrefix(false)
    L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg', {
      maxZoom: 8, noWrap: true, attribution: '<a href="https://www.earthdata.nasa.gov/gibs">NASA GIBS · Blue Marble composite</a>',
    }).on('tileerror', () => setImageryError(true)).on('tileload', () => setImageryError(false)).addTo(atlas)
    L.control.scale({ imperial: false, maxWidth: 110 }).addTo(atlas)
    atlas.setView([13, 0], Math.max(1, Math.log2(element.current.clientWidth / 256)))
    map.current = atlas
    sync?.current.add(atlas)
    const synchronize = () => {
      if (!sync || sync.updating) return
      sync.updating = true
      try {
        const center = atlas.getCenter()
        const zoom = atlas.getZoom()
        for (const peer of sync.current) {
          if (peer !== atlas && (Math.abs(peer.getZoom() - zoom) > .001 || peer.getCenter().distanceTo(center) > 100)) {
            peer.setView(center, zoom, { animate: false })
          }
        }
      } finally {
        sync.updating = false
      }
    }
    atlas.on('moveend', synchronize)
    const resize = new ResizeObserver(() => {
      if (map.current === atlas) atlas.invalidateSize({ animate: false })
    })
    resize.observe(element.current)
    return () => {
      map.current = null
      resize.disconnect()
      atlas.off('moveend', synchronize)
      sync?.current.delete(atlas)
      atlas.stop()
      atlas.remove()
    }
  }, [])
  useEffect(() => {
    const atlas = map.current
    if (!atlas) return
    if (selected && selected.id !== 'world') {
      const [w, s, e, n] = selected.bounds
      if (e > w && n > s) atlas.fitBounds([[s, w], [n, e]], { padding: [28, 28], maxZoom: 6, animate: false })
    } else {
      atlas.setView([13, 0], Math.max(1, Math.log2(atlas.getSize().x / 256)), { animate: false })
    }
  }, [regions, selected])
  useEffect(() => {
    const atlas = map.current
    if (!atlas) return
    const layer = L.layerGroup().addTo(atlas)
    const max = Math.max(1, ...points.map(point => point.weight ?? 1))
    const markers: L.CircleMarker[] = []
    points.forEach(point => {
      const label = document.createElement('span')
      label.textContent = `${platforms[point.platform] ?? point.sensor} · ${point.utc} · grid center ${point.latitude.toFixed(3)}°, ${point.longitude.toFixed(3)}°${point.weight == null ? '' : ' · ' + point.weight.toLocaleString() + (point.sensor === 'HARMONIZED' ? ' calibrated occupied cell-days' : ' raw detections in grid cell')} · Uploaded NASA FIRMS archive. A detection is not a unique fire.`
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: 3, fillColor: point.sensor === 'MODIS' ? '#ffb45f' : point.sensor === 'HARMONIZED' ? '#f27765' : '#f9d883',
        fillOpacity: .75, color: '#21140f', weight: .5,
      }).bindTooltip(label).addTo(layer)
      markers.push(marker)
    })
    const resizeMarkers = () => markers.forEach((marker, i) => {
      const relative = Math.sqrt((points[i].weight ?? 1) / max)
      marker.setRadius(Math.min(7, Math.max(1.2, (1.2 + 4 * relative) * Math.min(1.5, atlas.getZoom() / 4))))
    })
    resizeMarkers()
    atlas.on('zoomend', resizeMarkers)
    return () => { atlas.off('zoomend', resizeMarkers); if (map.current === atlas) layer.remove() }
  }, [points])
  useEffect(() => {
    const atlas = map.current
    if (!atlas) return
    const layer = L.layerGroup().addTo(atlas)
    alerts.forEach(alert => {
      const marker = L.circleMarker([alert.latitude, alert.longitude], {
        radius: Math.min(13, 6 + Math.sqrt(alert.count) * 1.5), color: '#ffebce', weight: 2,
        fillColor: '#ff5666', fillOpacity: .9,
      }).bindTooltip(`${alert.label} · ${alert.count} verified historical anomaly months · marker at approximate country center`)
        .on('click', () => select.current(alert.id)).addTo(layer)
      marker.bringToFront()
    })
    return () => { if (map.current === atlas) layer.remove() }
  }, [alerts])
  return <div className="atlas-map-shell"><div ref={element} className="atlas-map" role="region" aria-label="Interactive satellite hotspot map" />
    {imageryError && <p className="imagery-status" role="status">NASA GIBS imagery is temporarily unavailable. Archive grid detections remain mapped at their coordinates.</p>}</div>
}
