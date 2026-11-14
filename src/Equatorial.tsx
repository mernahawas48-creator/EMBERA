'use client'
import { useEffect, useState } from 'react'
import { Activity, ArrowLeft } from 'lucide-react'
import { api, format, type Point, type Region } from './api'
import { AtlasMap } from './AtlasMap'
import { Bars } from './Charts'

type Entry = Region & { assessed: number; flagged: number; series: {
  month: string; activity: number; evaluated_activity: number | null; baseline: number | null; robust_z: number | null; anomaly: boolean | null
}[] }

export default function Equatorial() {
  const [results, setResults] = useState<{ countries: Entry[]; evaluated_months: number; flagged_months: number }>()
  const [id, setId] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    api<typeof results>('/equatorial', controller.signal).then(data => {
      setResults(data)
      setId(data?.countries[0]?.id ?? '')
    }).catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [])
  const ranked = (results?.countries ?? []).map(region => ({
    region, peak: [...region.series].filter(row => row.anomaly).sort((a, b) => Math.abs(b.robust_z!) - Math.abs(a.robust_z!))[0]
  })).sort((a, b) => Math.abs(b.peak?.robust_z ?? 0) - Math.abs(a.peak?.robust_z ?? 0))
  const selected = results?.countries.find(country => country.id === id)
  const points: Point[] = ranked.flatMap(({ region, peak }, i) => peak ? [{
    id: i, latitude: (region.bounds[1] + region.bounds[3]) / 2,
    longitude: (region.bounds[0] + region.bounds[2]) / 2, platform: 'paired', sensor: '',
    utc: peak.month + ' · ' + region.name + ' · robust z ' + format(peak.robust_z)
  }] : [])
  return <main className="frame block method">
    <a className="text-action" href="/#atlas"><ArrowLeft size={16} /> Back to the atlas</a>
    <div className="section-heading"><div><p className="eyebrow"><Activity size={15} /> EQUATORIAL OBSERVATIONS</p>
      <h2>Equatorial Fire Intelligence</h2><p>Observed activity compared with each country’s seasonal history.</p></div></div>
    <p className="chart-caption">Eligible countries have observations intersecting ±10° latitude, at least 1,000 qualified cell-days and 24 comparable months. Each score uses a calibration fit from earlier years and at least three prior values for the same calendar month. Map markers are approximate country locations.</p>
    {error && <p className="status" role="alert">{error}</p>}
    {!results && !error && <p className="status" role="status">Evaluating historical holdouts…</p>}
    {results && <><p className="calibration">{results.evaluated_months} held-out country-months scored · {results.flagged_months} flagged at |z| ≥ 3.5</p>
      <a className="small-button" href="/api/exports/equatorial.csv">Download holdout scores</a>
      <AtlasMap regions={results.countries} selected={selected} points={points} onRegion={setId} />
      <div className="insight-grid" style={{ marginTop: 15 }}>
        <article className="panel anomalies"><h3>Ranked countries</h3>
          {ranked.length ? <ul>{ranked.map(({ region, peak }) => <li key={region.id}>
            <button className="inline-button" onClick={() => setId(region.id)}>{region.name}</button>
            <span>{peak ? `${peak.month} · z ${format(peak.robust_z)} · ${peak.robust_z! > 0 ? 'High' : 'Low'}` :
              region.assessed ? 'No threshold crossings' : 'Insufficient seasonal baseline'}</span>
          </li>)}</ul> : <p>No country currently meets the eligibility requirements.</p>}
        </article>
        {selected && <article className="panel"><h3>{selected.name}</h3><p>Held-out activity and its same-month baseline are expressed per paired day. The chart shows retrospective monthly totals.</p>
          <Bars label="Harmonized monthly activity" demo={false} values={selected.series.map(row => ({ name: row.month, value: row.activity, detail: 'Occupied cell-days' }))} />
          <ul>{selected.series.filter(row => row.robust_z !== null).slice(-18).reverse().map(row => <li key={row.month}>
            {row.month} · Activity {format(row.evaluated_activity)} · Baseline {format(row.baseline)} · z {format(row.robust_z)}{row.anomaly ? row.robust_z! > 0 ? ' · Unusually high' : ' · Unusually low' : ''}
          </li>)}</ul>
        </article>}
      </div></>}
    <p className="chart-caption">These scores describe past observations. Detection accuracy cannot be estimated without independently labeled events.</p>
  </main>
}
