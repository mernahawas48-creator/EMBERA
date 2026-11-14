import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Activity, ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, CalendarDays, ChevronDown, Compass, Flame, Globe2, Layers3, Radio, Satellite } from 'lucide-react'
import { api, endpoint, format, monthNames, platforms, query, type Analysis, type Coverage, type Filters, type Hotspots, type Month, type Region } from './api'
import { AtlasMap } from './AtlasMap'
import { Bars, Calendar, Rings } from './Charts'
import DailyCalendar from './DailyCalendar'
import type L from 'leaflet'

const links = [['observatory', 'Observatory'], ['atlas', 'Fire Atlas'], ['record', 'Fire Record'], ['insights', 'Insights'], ['data', 'Data'], ['methodology', 'Methodology']]
// Only actual imported coverage is selected after /api/coverage responds.
const firstRange = { start: '2020-01-01', end: '2025-12-31' }
const emptyPoints: Hotspots = { points: [], next_after: null }
const raw = (row: Month | undefined, sensor: string) => {
  if (!row) return null
  const counts = Object.entries(row.raw).filter(([key]) => key === sensor || platforms[key]?.startsWith(sensor)).map(([, count]) => count)
  return counts.every(count => count == null) ? null : counts.reduce<number>((sum, count) => sum + (count ?? 0), 0)
}

export default function App() {
  const [section, setSection] = useState(location.hash.slice(1) || 'observatory')
  const [regions, setRegions] = useState<Region[]>([])
  const demo = false
  const [region, setRegion] = useState('world')
  const [dates, setDates] = useState(firstRange)
  const customDates = useRef<typeof firstRange | null>(null)
  const [coverage, setCoverage] = useState<Coverage | null>(null)
  const [processing, setProcessing] = useState<{ uploaded?: boolean; processed?: number; expected?: number; crc_matched?: number; checkpoint_verified?: boolean; reported_input_rows?: number; failed?: string[] } | null>(null)
  const [filters, setFilters] = useState<Filters | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [hotspots, setHotspots] = useState<Hotspots>(emptyPoints)
  const [after, setAfter] = useState(0)
  const [active, setActive] = useState('')
  const [mapMonth, setMapMonth] = useState('')
  const [metricChoice, setMetric] = useState('auto')
  const [platform, setPlatform] = useState('')
  const [comparisonMode, setComparisonMode] = useState(false)
  const [comparison, setComparison] = useState<{ sensors: Record<string, { detections: number; observed_days: number; occupied_cell_days: number }>; overlapping_cell_days: number } | null>(null)
  const [comparisonPoints, setComparisonPoints] = useState<{ modis: Hotspots; viirs: Hotspots }>({ modis: emptyPoints, viirs: emptyPoints })
  const synchronizedMaps = useRef<Set<L.Map>>(new Set())
  const [loading, setLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(false)
  const [error, setError] = useState('')
  const [mapError, setMapError] = useState('')
  const [retry, setRetry] = useState(0)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const update = () => setSection(location.hash.slice(1) || 'observatory')
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => {
    const request = new AbortController()
    api<Region[]>('/regions', request.signal).then(setRegions).catch(() => {})
    api<{ uploaded?: boolean; processed?: number; expected?: number; crc_matched?: number; checkpoint_verified?: boolean; reported_input_rows?: number; failed?: string[] }>('/processing', request.signal)
      .then(setProcessing).catch(() => {})
    return () => request.abort()
  }, [retry])
  useEffect(() => {
    const request = new AbortController()
    setLoading(true)
    setError('')
    setAnalysis(null)
    setFilters(null)
    setCoverage(null)
    setMapMonth('')
    setAfter(0)
    api<Coverage>(`/coverage?region=${region}&demo=${demo}`, request.signal).then(result => {
      setCoverage(result)
      const available = result.start && result.end
        ? { start: result.start, end: result.end }
        : demo ? { start: '2014-01-01', end: '2024-12-31' } : firstRange
      const range = customDates.current ?? available
      setDates(range)
      setFilters({ region, demo, ...range })
    }).catch(err => {
      if (!request.signal.aborted) { setError(err.message); setLoading(false) }
    })
    return () => request.abort()
  }, [region, demo, retry])

  useEffect(() => {
    if (!filters) return
    const request = new AbortController()
    setLoading(true)
    setError('')
    setAnalysis(null)
    setActive('')
    api<Analysis>(`/analysis?${query(filters)}`, request.signal).then(result => {
      setAnalysis(result)
      const latest = [...result.months].reverse().find(row => row.activity != null || Object.values(row.raw).some(value => value != null))?.month ?? ''
      setActive(latest)
      setMapMonth(latest)
    }).catch(err => {
      if (!request.signal.aborted) setError(err.message)
    }).finally(() => {
      if (!request.signal.aborted) setLoading(false)
    })
    return () => request.abort()
  }, [filters])

  useEffect(() => {
    setHotspots(emptyPoints)
    setMapError('')
    if (!filters || !analysis || !mapMonth) { setMapLoading(false); return }
    const request = new AbortController()
    let mapFilters = filters
    if (mapMonth.length === 10) {
      mapFilters = { ...filters, start: mapMonth, end: mapMonth }
    } else if (mapMonth) {
      const [y, m] = mapMonth.split('-').map(Number)
      const end = `${mapMonth}-${new Date(Date.UTC(y, m, 0)).getUTCDate()}`
      mapFilters = { ...filters, start: [filters.start, mapMonth + '-01'].sort()[1], end: [filters.end, end].sort()[0] }
    }
    setMapLoading(true)
    api<Hotspots>(`/hotspots?${query(mapFilters, { limit: '3000', after: String(after), ...(platform ? { platform } : {}) })}`, request.signal)
      .then(setHotspots).catch(err => { if (!request.signal.aborted) setMapError(err.message) })
      .finally(() => { if (!request.signal.aborted) setMapLoading(false) })
    return () => request.abort()
  }, [filters, analysis, mapMonth, after, platform])

  useEffect(() => {
    if (!comparisonMode || !filters || !analysis || !mapMonth) return
    const controller = new AbortController()
    const [y, m] = mapMonth.split('-').map(Number)
    const monthEnd = mapMonth.length === 7 ? `${mapMonth}-${new Date(Date.UTC(y, m, 0)).getUTCDate()}` : mapMonth
    const selected = { ...filters,
      start: [filters.start, mapMonth.length === 7 ? `${mapMonth}-01` : mapMonth].sort()[1],
      end: [filters.end, monthEnd].sort()[0] }
    const params = query(selected, { limit: '3000' })
    Promise.all([
      api<Hotspots>(`/hotspots?${params}&platform=aqua`, controller.signal),
      api<Hotspots>(`/hotspots?${params}&platform=noaa20`, controller.signal),
      api<typeof comparison>(`/comparison?${params}`, controller.signal),
    ]).then(([modis, viirs, stats]) => { setComparisonPoints({ modis, viirs }); setComparison(stats) })
      .catch(err => { if (!controller.signal.aborted) setMapError(err.message) })
    return () => controller.abort()
  }, [comparisonMode, filters, analysis, mapMonth])

  const rows = analysis?.months
  const byMonth = useMemo(() => new Map((rows ?? []).map(row => [row.month, row])), [rows])
  const years = useMemo(() => [...new Set((rows ?? []).map(row => row.month.slice(0, 4)))], [rows])
  const visibleYears = coverage?.start ? years : []
  const recent = visibleYears.slice(-11)
  const [allYears, setAllYears] = useState(false)
  const compare = (rows ?? []).filter(r => r.activity != null).length
  const metric = metricChoice !== 'auto' ? metricChoice : compare ? 'activity' :
    rows?.some(row => raw(row, 'VIIRS') != null) ? 'VIIRS' :
    rows?.some(row => raw(row, 'MODIS') != null) ? 'MODIS' : 'activity'
  const display = (row?: Month) => metric === 'activity' ? row?.activity ?? null : raw(row, metric)
  const max = Math.max(0, ...(rows ?? []).map(row => display(row) ?? 0))
  const record = byMonth.get(active)
  const annotations = (rows ?? []).filter(r => r.robust_z != null).length
  const flagged = (rows ?? []).filter(r => r.anomaly)
  const chosen = regions.find(r => r.id === region)
  const metricName = metric === 'activity' ? 'Activity index' : metric + ' detections'
  const exportQuery = filters ? query(filters) : ''

  function chooseMonth(month: string) {
    setActive(month)
    setMapMonth(month)
    setAfter(0)
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dates.start || !dates.end || dates.start > dates.end || dates.start < '2000-01-01' || dates.end > '2100-12-31') {
      setFormError('Enter ordered dates between 2000 and 2100.')
      return
    }
    setFormError('')
    customDates.current = dates
    setMapMonth('')
    setAfter(0)
    setFilters({ ...dates, region, demo })
  }
  function reset() {
    const range = coverage?.start && coverage.end ? { start: coverage.start, end: coverage.end } : firstRange
    setDates(range)
    customDates.current = null
    setFormError('')
    setMapMonth('')
    setAfter(0)
    setFilters({ ...range, region, demo })
  }
  function chooseRegion(id: string) {
    setFormError('')
    setRegion(id)
  }
  function reload() {
    setRetry(value => value + 1)
  }
  const chart = { byMonth, active, onSelect: chooseMonth, metric: metricName, value: display, max, demo }

  return <>
    <a href="#atlas" className="skip">Skip to the atlas</a>
    <header className="masthead">
      <div className="frame masthead-inner">
        <a className="brand" href="#observatory" aria-label="EMBERA observatory"><span className="brand-mark"><Flame size={20} strokeWidth={1.6} /></span> EMBERA</a>
        <nav aria-label="Main navigation">{links.map(([hash, label]) => <a key={hash} href={'#' + hash} aria-current={section === hash ? 'location' : undefined}>{label}</a>)}<a href="/equatorial">Equatorial Intelligence</a><a href="/bioscape" target="_blank" rel="noreferrer">BioSCape Explorer</a></nav>
        <a className="source-link" href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noreferrer"><Radio size={14} /> NASA FIRMS <ArrowUpRight size={13} /></a>
      </div>
    </header>
    <main>
      <section id="observatory" className="hero">
        <div className="frame hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span className="signal" /> EARTH OBSERVATION / FIRE HISTORY</div>
            <h1>The Fire<br />Memory <em>Atlas.</em></h1>
            <p>Explore seasonal thermal detections in the years actually available from the uploaded satellite archive.</p>
            <div className="hero-actions"><a href="#atlas" className="primary"><Compass size={17} /> Explore the atlas <ArrowRight size={17} /></a><a href="#methodology" className="text-action">Our methodology <ArrowUpRight size={15} /></a></div>
          </div>
          <div className="hero-visual">
            <div className="orbit orbit-outer" /><div className="orbit orbit-inner" /><i className="reticle reticle-n" /><i className="reticle reticle-s" /><i className="reticle reticle-w" /><i className="reticle reticle-e" />
            <img src="/earth-orb.webp" alt="Atlantic-centered Earth at night, colored in warm amber" width="900" height="900" />
            <a className="imagery-label" href="https://svs.gsfc.nasa.gov/30876/" target="_blank" rel="noreferrer">BLACK MARBLE 2016 <ArrowUpRight size={11} /><br /><span>NASA GODDARD</span></a>
          </div>
        </div>
        <div className="frame hero-foot">
          <span><Satellite size={15} /> MODIS + VIIRS</span><span><Globe2 size={15} /> GLOBAL & REGIONAL VIEWS</span><a href="#atlas">SCROLL TO EXPLORE <ArrowDown size={14} /></a>
        </div>
      </section>
      <section id="atlas" className="frame block">
        <div className="section-heading">
          <div><p className="eyebrow"><Compass size={15} /> THE OBSERVATORY</p><h2>Fire Atlas</h2><p>Locate satellite detections and trace how activity changes over time.</p></div>
        </div>
        <div className="atlas-panel">
          <form className="filters" onSubmit={apply}>
            <label className="region-filter">REGION <span className="select-wrap"><Globe2 size={16} /><select value={region} onChange={event => chooseRegion(event.target.value)}>
              {regions.length === 0 && <option value="world">Global</option>}
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select><ChevronDown size={13} /></span></label>
            <label>START DATE <input aria-label="Start date" type="date" required min="2000-01-01" max="2100-12-31" value={dates.start} onChange={e => setDates({ ...dates, start: e.target.value })} /></label>
            <label>END DATE <input aria-label="End date" type="date" required min="2000-01-01" max="2100-12-31" value={dates.end} onChange={e => setDates({ ...dates, end: e.target.value })} /></label>
            <button className="primary apply" type="submit" disabled={!coverage}>Apply filters <ArrowRight size={15} /></button>
            <button className="small-button reset" type="button" onClick={reset} disabled={!coverage}>Reset</button>
          </form>
          {formError && <p className="status" role="alert">{formError}</p>}
          {error && <div className="status" role="alert">{error} <button className="small-button" onClick={reload}>Retry</button></div>}
          {!error && !loading && !coverage?.start && <div className="status">No observations have been imported for this selection.</div>}
          {!error && !loading && coverage?.start && !compare && <p className="status">No validated paired-day activity for this selection. Raw MODIS and VIIRS counts remain available; missing observations are not zero fire activity.</p>}
          <div className="map-controls">
            <button type="button" className="small-button" aria-pressed={comparisonMode} onClick={() => setComparisonMode(value => !value)}>{comparisonMode ? 'Single map' : 'Compare MODIS vs VIIRS'}</button>
            <label><Layers3 size={15} /><span className="sr-only">Map satellite</span><select value={platform} onChange={event => { setPlatform(event.target.value); setAfter(0) }}>
              <option value="">Both sensors</option><option value="aqua">MODIS (all uploaded platforms)</option><option value="noaa20">VIIRS (all uploaded platforms)</option><option value="paired">Harmonized paired-day index</option>
            </select></label>
            {mapMonth && <span className="map-date">Map period: {mapMonth}</span>}
          </div>
          {comparisonMode ? <div className="comparison-maps">
            <div><strong>MODIS · uploaded platforms</strong><AtlasMap regions={regions} selected={chosen} points={comparisonPoints.modis.points} onRegion={chooseRegion} sync={synchronizedMaps} /></div>
            <div><strong>VIIRS · uploaded platforms</strong><AtlasMap regions={regions} selected={chosen} points={comparisonPoints.viirs.points} onRegion={chooseRegion} sync={synchronizedMaps} /></div>
          </div> : <AtlasMap regions={regions} selected={chosen} points={hotspots.points} onRegion={chooseRegion} />}
          {comparisonMode && comparison && <div className="comparison-stats" role="status">
            <span>MODIS raw detections <b>{format(comparison.sensors.MODIS?.detections)}</b></span>
            <span>VIIRS raw detections <b>{format(comparison.sensors.VIIRS?.detections)}</b></span>
            <span>Shared cell-days <b>{format(comparison.overlapping_cell_days)}</b></span>
            <span>Observed dates <b>{format(comparison.sensors.MODIS?.observed_days)} / {format(comparison.sensors.VIIRS?.observed_days)}</b></span>
          </div>}
          <div className="map-footer"><div className="key"><span><i /> MODIS raw</span><span><i /> VIIRS raw</span><span><i /> Harmonized occupancy</span><span>Dot area reflects relative grid value; scale changes with zoom.</span></div>
            <div role="status">{mapError || (mapLoading ? 'Loading detections…' : hotspots.points.length ? format(hotspots.points.length) + (hotspots.aggregated ? ' highest-value spatial grid cells shown' : ' plotted detections') : (hotspots.message || 'No detections to plot'))}</div>
            <div className="pages">{after > 0 && <button className="small-button" onClick={() => setAfter(0)}>First page</button>}{hotspots.next_after !== null && <button className="small-button" onClick={() => setAfter(hotspots.next_after!)}>Next page <ArrowRight size={13} /></button>}</div>
          </div>
        </div>
      </section>
      <section id="record" className="frame block record">
        <div className="section-heading"><div><p className="eyebrow"><CalendarDays size={15} /> THE FIRE RECORD</p><h2>Fire through time</h2><p>Select a month in either chart to inspect its detections on the map.</p></div>
          <label className="metric"><span>CHART METRIC</span><select value={metricChoice} onChange={event => setMetric(event.target.value)}><option value="auto">Automatic ({metricName})</option><option value="activity">Harmonized activity index</option><option value="MODIS">Raw MODIS detections</option><option value="VIIRS">Raw VIIRS detections</option></select></label>
        </div>
        <div className="chart-grid">
          <article className="panel ring-panel"><h3>Fire Memory Rings</h3><p>One ring per year, January clockwise from the top.</p><Rings years={visibleYears} {...chart} /></article>
          <article className="panel calendar-panel"><h3>Burning Calendar</h3><p>Monthly values across the selected date range.</p><Calendar years={allYears ? visibleYears : recent} {...chart} />
            {visibleYears.length > 11 && <button className="small-button" onClick={() => setAllYears(!allYears)}>{allYears ? 'Show latest 11 years' : `Show all ${visibleYears.length} years`}</button>}
            <dl className="month-detail" aria-live="polite">
              <div><dt>MONTH</dt><dd>{active || '—'}</dd></div><div><dt>ACTIVITY INDEX</dt><dd>{format(record?.activity)}</dd></div>
              <div><dt>RAW MODIS</dt><dd>{format(raw(record, 'MODIS'))}</dd></div><div><dt>RAW VIIRS</dt><dd>{format(raw(record, 'VIIRS'))}</dd></div>
            </dl>
            <p className="chart-caption">{loading ? 'Loading calendar…' : record?.partial ? 'Partial selection month. Activity index withheld.' : record?.platform ? `Paired-day index: ${platforms[record.platform]} · ${record.paired_days ?? '—'} paired days (${format((record.paired_day_fraction ?? 0) * 100)}% of month; not verified swath coverage)` : 'Activity requires 20+ paired-observation days and validated regional calibration.'}</p>
            {filters && record && <DailyCalendar filters={filters} month={record.month} metric={metric}
              onSelect={day => { setMapMonth(day); setAfter(0) }} />}
          </article>
        </div>
      </section>
      <section id="insights" className="frame block">
        <div className="section-heading"><div><p className="eyebrow"><Activity size={15} /> HISTORICAL INSIGHTS</p><h2>Seasons & anomalies</h2><p>{format(compare)} comparable months · {format(annotations)} months with a historical anomaly score</p></div></div>
        <div className="insight-grid">
          <article className="panel"><h3>Annual activity</h3><p>Totals require 12 comparable months.</p><Bars label="Annual activity" demo={demo}
            values={(analysis?.yearly ?? []).filter(() => coverage?.start).map(y => ({ name: y.year, value: y.activity, detail: `${y.comparable_months}/12 months` }))} /></article>
          <article className="panel"><h3>Seasonal profile</h3><p>Median activity by calendar month.</p><Bars label="Seasonal profile" demo={demo}
            values={(analysis?.seasonal ?? []).map(y => ({ name: monthNames[y.month - 1], value: y.median, detail: `${y.years} years` }))} /></article>
        </div>
        <article className="panel anomalies"><h3>Anomalous months</h3><p>Compared with earlier paired activity for the same calendar month.</p>
          {flagged.length ? <ul>{flagged.map(row => <li key={row.month}><button className="inline-button" onClick={() => chooseMonth(row.month)}>{row.month}</button><span>Activity per paired day {format(row.evaluated_activity)} · Baseline {format(row.baseline)} · Robust z {format(row.robust_z)}</span></li>)}</ul> :
            <p className="chart-caption">{annotations ? 'No month crossed the |z| ≥ 3.5 threshold.' : 'At least three earlier comparable years and nonzero baseline variation are required.'}</p>}
        </article>
      </section>
      <section id="data" className="frame block">
        <div className="section-heading"><div><p className="eyebrow"><Layers3 size={15} /> DATA EXPLORER</p><h2>Observation archive</h2><p>Compare individual platforms and download the filtered records.</p></div></div>
        <article className="panel">
          {processing?.uploaded && <p className="chart-caption">Uploaded archive · {processing.processed}{processing.expected ? ' / ' + processing.expected : ''} CSV checkpoint members · {processing.crc_matched ?? '—'} CRC matches · {processing.failed?.length ?? 0} flagged errors{processing.reported_input_rows ? ` · ${format(processing.reported_input_rows)} reported input rows` : ''}. These are checkpoint records, not an independent CSV or geospatial integrity audit.</p>}
          <div className="table-wrap"><table><caption>Raw detections across the selected range{demo && ' · Synthetic demo'}</caption>
            <thead><tr><th>Sensor</th><th>Detections</th><th>Months with 20+ paired days</th></tr></thead>
            <tbody>{[['MODIS', 'MODIS (all platforms)'], ['VIIRS', 'VIIRS (all uploaded platforms)']].map(([key, name]) => {
              const counts = (rows ?? []).map(row => row.raw[key]).filter((value): value is number => value != null)
              return <tr key={key}><th scope="row">{name}</th><td>{format(counts.length ? counts.reduce((a, b) => a + b, 0) : null)}</td><td>{(rows ?? []).filter(r => r.complete_platforms.includes(key)).length}</td></tr>
            })}</tbody>
          </table></div>
          <div className="export-actions">{filters && !error && <><a className="primary" href={endpoint('/exports/calendar.csv?' + exportQuery)}><ArrowDownToLine size={16} /> Calendar CSV</a><a className="small-button" href={endpoint('/exports/yearly.csv?' + exportQuery)}><ArrowDownToLine size={16} /> Yearly CSV</a><a className="small-button" href={endpoint('/exports/hotspots.csv?' + exportQuery)}><ArrowDownToLine size={16} /> Map grid CSV</a></>}</div>
        </article>
      </section>
      <section id="methodology" className="frame block method">
        <div className="section-heading"><div><p className="eyebrow"><Satellite size={15} /> METHODOLOGY</p><h2>From detection to record</h2></div></div>
        <article className="panel evidence"><h3>Harmonization evidence</h3>
          <p>Selected region: {regions.find(item => item.id === region)?.name ?? region} · {record?.month ?? 'No observed month selected'}. Raw detections and calibrated occupied cell-days have different units.</p>
          <div className="evidence-grid"><div><span>Raw MODIS detections</span><strong>{format(raw(record, 'MODIS'))}</strong></div>
            <div><span>Raw VIIRS detections</span><strong>{format(raw(record, 'VIIRS'))}</strong></div>
            <div><span>Paired-day activity index</span><strong>{format(record?.activity)}</strong></div></div>
          <p>{record?.activity == null ? 'A comparable estimate is unavailable for this month.' : `${record.paired_days} matched observation days; NOAA-20 occupancy was multiplied by ${format(analysis?.calibration.factor)} before averaging with Aqua occupancy.`}</p>
          <p>{analysis?.calibration.validation.held_out_months ? `${analysis.calibration.validation.held_out_months} leave-one-year-out months: median relative error ${format((analysis.calibration.validation.median_relative_error ?? 0) * 100)}% calibrated versus ${format((analysis.calibration.validation.uncalibrated_median_relative_error ?? 0) * 100)}% uncalibrated; 90th percentile ${format((analysis.calibration.validation.p90_relative_error ?? 0) * 100)}%.` : 'Held-out validation is unavailable for this region.'} This measures sensor agreement, not true fire detection accuracy.</p>
          <a className="text-action" href="#record">Inspect the interactive monthly comparison <ArrowRight size={15} /></a>
        </article>
        <div className="methods-grid">
          <article><h3>What satellites see</h3><p>FIRMS reports thermal anomalies observed during satellite overpasses. Clouds, smoke, revisit timing, and sensor resolution affect detection. A hotspot may be one of several observations of the same fire or a different heat source. Counts cannot measure unique fires or area burned.</p></article>
          <article><h3>How the index works</h3><p>EMBERA counts occupied equal-area cells per UTC day. It uses standard-product vegetation detections from Aqua and NOAA-20, with MODIS confidence ≥30 and nominal or high VIIRS confidence. It averages Aqua occupancy and calibrated NOAA-20 occupancy on paired observation days. Global figures pool the supplied country labels, which can overlap geographically.</p></article>
          <article><h3>When comparisons are available</h3><p>Monthly matched-day estimates require at least 20 dates with both sensor records. Calibration needs 12 held-out months across seasons and stable improvement over uncalibrated comparisons. Seasonal anomaly scores use earlier years and a minimum spread of one occupied cell-day per paired day or 10% of baseline. These estimates are NOT full-month fire totals: archive detections cannot establish complete satellite exposure or distinguish a missing swath from no fire.</p></article>
        </div>
        <p className="calibration" role="status">Regional overlap · {analysis?.calibration.overlap_months ?? 0} qualifying months · {analysis?.calibration.factor == null ? 'NOAA-20 conversion unavailable' : `NOAA-20 × ${analysis.calibration.factor.toFixed(3)}`}</p>
        {analysis && analysis.calibration.validation.held_out_months > 0 && <p className="chart-caption">
          {analysis.calibration.validation.held_out_months} held-out months · Median relative error {format((analysis.calibration.validation.median_relative_error ?? 0) * 100)}% calibrated, {format((analysis.calibration.validation.uncalibrated_median_relative_error ?? 0) * 100)}% before calibration · 90th percentile {format((analysis.calibration.validation.p90_relative_error ?? 0) * 100)}%
        </p>}
        <a className="text-action" href="https://firms.modaps.eosdis.nasa.gov/download/" target="_blank" rel="noreferrer">NASA FIRMS Archive <ArrowUpRight size={15} /></a>
      </section>
    </main>
    <footer className="footer"><div className="frame"><a className="brand" href="#observatory"><Flame size={19} /> EMBERA</a><span>The Fire Memory Atlas</span><span>NASA Space Apps Challenge 2026</span></div></footer>
  </>
}

