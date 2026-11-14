'use client'
import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, Flame, Radio, ShieldAlert, ClipboardCheck, ChevronDown } from 'lucide-react'
import { api, format, type Region } from './api'

type Entry = Region & { assessed: number; flagged: number; series: {
  month: string; activity: number; evaluated_activity: number | null; baseline: number | null; robust_z: number | null; anomaly: boolean | null
}[] }
type Intelligence = {
  status: string
  model: { name: string; trained_utc: string; source: string; periods: Record<string, string>; features: string[]; threshold: number;
    metrics: Record<string, { samples: number; countries: number; score_median: number; score_p95: number; ml_flags: number; ml_flag_rate: number; seasonal_flags: number; flag_overlap: number }>;
    limitations: string[] } | null
  results: { case: { country: string; month: string; score: number; anomaly: boolean; seasonal_flag: boolean; activity: number; baseline: number; paired_days: number; raw_occupied: Record<string, number>; factor: number; calibration: { validation: { median_relative_error: number; uncalibrated_median_relative_error: number; p90_relative_error: number } } } } | null
  recent: { geography: string; processing: string; sources: Record<string, { rows: number; accepted: number; rejected: number; qualified: number; versions: Record<string, number>; platforms: Record<string, number>; bounds: number[]; dates: Record<string, number>; type_field_present: boolean }> } | null
  recent_summary?: Record<string, number>
  recent_points?: { id: number; sensor: string; platform: string; utc: string; latitude: number; longitude: number; frp: number | null; confidence: string; qualified: number }[]
  historical?: { country: string; month: string; activity: number; baseline: number; score: number; anomaly: boolean; paired_days: number; calibration: unknown }[]
  alerts: unknown[]
}
type RecentAlert = { sensor: string; region: string; period: [string,string]; latitude: number; longitude: number; cell_count: number; activity: number; baseline: number; score: number; severity: 'HIGH'|'MEDIUM'|'LOW'; explanation: string; recommendation: string; uncertainty: string }
type RecentAlertResponse = { period: [string,string] | null; alerts: RecentAlert[]; watch: RecentAlert[]; status: string; method?: string }

export default function Equatorial() {
  const [results, setResults] = useState<{ countries: Entry[]; evaluated_months: number; flagged_months: number }>()
  const [id, setId] = useState('')
  const [error, setError] = useState('')
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null)
  const [intelligenceError, setIntelligenceError] = useState('')
  const [alertSort, setAlertSort] = useState('score')
  const [recentAlerts, setRecentAlerts] = useState<RecentAlertResponse | null>(null)
  const [bioHeight, setBioHeight] = useState(1800)
  useEffect(() => {
    const controller = new AbortController()
    api<typeof results>('/equatorial', controller.signal).then(data => {
      setResults(data)
      setId(data?.countries[0]?.id ?? '')
    }).catch(err => { if (!controller.signal.aborted) setError(err.message) })
    api<Intelligence>('/intelligence', controller.signal).then(setIntelligence)
      .catch(() => { if (!controller.signal.aborted) setIntelligenceError('unavailable') })
    api<RecentAlertResponse>('/recent-alerts', controller.signal).then(setRecentAlerts)
      .catch(() => { if (!controller.signal.aborted) setRecentAlerts({period:null,alerts:[],watch:[],status:'unavailable'}) })
    return () => controller.abort()
  }, [])
  const ranked = (results?.countries ?? []).map(region => ({
    region, peak: [...region.series].filter(row => row.anomaly).sort((a, b) => Math.abs(b.robust_z!) - Math.abs(a.robust_z!))[0]
  })).sort((a, b) => Math.abs(b.peak?.robust_z ?? 0) - Math.abs(a.peak?.robust_z ?? 0))
  const selected = results?.countries.find(country => country.id === id)
  const summaries = Object.entries(intelligence?.recent_summary ?? {})
  const alertRows = [...(recentAlerts?.alerts ?? [])].sort((a, b) => alertSort === 'date' ? b.period[1].localeCompare(a.period[1]) : b.score - a.score)
  const monthRows = selected?.series.filter(row => row.evaluated_activity != null) ?? []
  const chartMax = Math.max(1, ...monthRows.flatMap(row => [row.evaluated_activity ?? 0, row.baseline ?? 0]))
  return <main className="frame block method">
    <a className="text-action" href="/#atlas"><ArrowLeft size={16} /> Back to the atlas</a>
    <div className="section-heading"><div><p className="eyebrow"><Activity size={15} /> EQUATORIAL OBSERVATIONS</p>
      <h2>Equatorial Fire Intelligence</h2><p>Observed activity compared with each country’s seasonal history.</p></div></div>
    <p className="chart-caption">Recent weekly signals compare each sensor independently with seasonal historical detections on the same map grid. A year with no detection is treated as missing, not as zero. Signals are monitoring prompts, not confirmed fires or predictions.</p>
    {intelligenceError && <p className="status" role="status">Current CSV details are temporarily unavailable. Historical statistics below remain available.</p>}
    {intelligence && <section className="insight-grid" aria-label="ML model overview" style={{ margin: '18px 0' }}>
      <article className="panel"><p className="eyebrow">HISTORICAL ACTIVITY ANALYTICS</p>
        {intelligence.model ? <><h3>{intelligence.model.name}</h3><p>Training {intelligence.model.periods.train} · validation {intelligence.model.periods.validation} · untouched holdout {intelligence.model.periods.holdout}. {Object.keys(intelligence.model.metrics).length ? `${intelligence.model.metrics.holdout?.samples ?? 0} holdout country-months across ${intelligence.model.metrics.holdout?.countries ?? 0} countries.` : ''}</p>
          <p>Training threshold {format(intelligence.model.threshold)} · features: seasonal activity, month-to-month change, repeat occupied cells, sensor gap, paired observation coverage.</p>
          <p>Novelty scores only; no independent event labels support precision, recall, or wildfire prediction.</p>
          <details><summary>Validation and holdout results</summary><ul>{Object.entries(intelligence.model.metrics).map(([split, metric]) => <li key={split}>{split}: {metric.samples} country-months, median score {format(metric.score_median)}, p95 {format(metric.score_p95)}, model flags {metric.ml_flags}, seasonal baseline flags {metric.seasonal_flags}, overlap {metric.flag_overlap}.</li>)}</ul></details>
        </> : <><h3>Seasonal baseline comparisons</h3><p>Historical detection baselines and observed trends are available. A machine learning model is not being used for this week's alerts.</p></>}
      </article>
      <article className="panel"><p className="eyebrow">LATEST SUPPLIED OBSERVATIONS</p>
        {intelligence.recent ? <><h3>Northern and Central Africa · regional NRT</h3>
          <div className="kpi-grid"><div className="kpi"><Radio/><strong>{(intelligence.recent_summary?.MODIS ?? 0).toLocaleString()}</strong><span>MODIS observations</span></div><div className="kpi"><Radio/><strong>{(intelligence.recent_summary?.VIIRS ?? 0).toLocaleString()}</strong><span>VIIRS observations</span></div><div className="kpi"><Flame/><strong>{(intelligence.recent_points ?? []).length.toLocaleString()}</strong><span>mapped sample points</span></div></div>
          {Object.entries(intelligence.recent.sources).map(([sensor, source]) => <p key={sensor}><strong>{sensor}</strong>: {source.accepted.toLocaleString()} accepted / {source.rows.toLocaleString()} rows, {source.qualified.toLocaleString()} confidence-qualified. {Object.entries(source.platforms).map(([platform, count]) => `${platform} ${count.toLocaleString()}`).join(', ')}.</p>)}
          <p>Acquired Nov 7–14, 2026; Nov 14 is partial. No vegetation type is supplied. These are raw NRT detections; calibration transfer and recent anomaly inference are not validated.</p>
        </> : <p>No audited seven-day files are available.</p>}
      </article>
    </section>}
    {error && <p className="status" role="alert">{error}</p>}
    {!results && !error && <p className="status" role="status">Evaluating historical holdouts…</p>}
    {results && <><p className="calibration">{results.evaluated_months} held-out country-months scored · {results.flagged_months} flagged at |z| ≥ 3.5</p>
      <a className="small-button" href="/api/exports/equatorial.csv">Download holdout scores</a>
      {intelligence && <div className="kpi-grid stats-cards"><div className="kpi"><Activity/><strong>{results.evaluated_months.toLocaleString()}</strong><span>Historical country-months scored</span></div><div className="kpi"><ShieldAlert/><strong>{results.flagged_months.toLocaleString()}</strong><span>Historical seasonal signals</span></div><div className="kpi"><Radio/><strong>{summaries.reduce((sum,[,n])=>sum+n,0).toLocaleString()}</strong><span>Recent raw detections</span></div><div className="kpi"><Flame/><strong>{intelligence.model ? 'Historical ML + baseline' : 'Historical baseline'}</strong><span>Recent alerts use seasonal statistics</span></div></div>}
      <article className="panel anomalies" style={{ marginTop: 15 }}><div className="dashboard-toolbar"><div><p className="eyebrow"><ShieldAlert size={15}/> CURRENT WEEK · STATISTICAL WATCH</p><h3>Recent activity alerts</h3><p>{recentAlerts?.period ? `${recentAlerts.period[0]} – ${recentAlerts.period[1]} · latest incomplete day excluded` : 'Comparing current observations with historical seasonal detections'}</p></div><label>Sort<select value={alertSort} onChange={e => setAlertSort(e.target.value)}><option value="score">Largest deviation</option><option value="date">Most recent</option></select></label></div>
        {alertRows.length ? <ul className="alert-cards">{alertRows.map((alert, index) => <li key={`${alert.sensor}-${alert.latitude}-${alert.longitude}-${index}`} className={`alert-card severity-${alert.severity.toLowerCase()}`}><div className="alert-card-head"><span className="severity-pill"><ShieldAlert size={14}/>{alert.severity}</span><time>{alert.period[0]} – {alert.period[1]}</time><span className="sensor-tag">{alert.sensor}</span></div><h4>{alert.region} · around {alert.latitude.toFixed(2)}°, {alert.longitude.toFixed(2)}°</h4><div className="alert-metrics"><span><small>Recent cell-days</small><strong>{format(alert.activity)}</strong></span><span><small>Seasonal typical</small><strong>{format(alert.baseline)}</strong></span><span><small>Deviation score</small><strong>{format(alert.score)}</strong></span></div><p>{alert.explanation}</p><details><summary><ChevronDown size={14}/> How this was assessed</summary><p>{alert.uncertainty} Seasonal baseline includes {alert.cell_count} nearby cell(s); at least 3 historical detection years.</p></details></li>)}</ul> : <div className="no-alerts"><ShieldAlert/><div><h4>{recentAlerts?.status === 'no_statistically_significant_anomalies' ? 'No statistically significant anomalies detected' : 'No current alerts meet the comparison criteria'}</h4><p>Recent detections are still shown in the dashboard totals. Cells without enough historical observations are left unscored.</p></div></div>}
      </article>
      <article className="panel recommendations-panel"><p className="eyebrow"><ClipboardCheck size={15}/> RECOMMENDATIONS</p><h3>Practical next steps</h3>{recentAlerts?.alerts.length ? <div className="recommendation-grid">{recentAlerts.alerts.slice(0,6).map((alert,i)=><div key={`${alert.sensor}-${alert.latitude}-${i}`}><strong>{alert.severity} · {alert.sensor} · {alert.latitude.toFixed(1)}°, {alert.longitude.toFixed(1)}°</strong><p>{alert.recommendation}</p></div>)}</div> : <div className="recommendation-grid"><div><strong>Keep monitoring</strong><p>Review detections after the next available satellite pass; only cells with enough historical observations are assessed.</p></div><div><strong>Verify before escalation</strong><p>Check repeated detections with local environmental monitoring sources. A satellite hotspot alone does not confirm a wildfire.</p></div></div>}</article>
      {!!recentAlerts?.watch?.length && <article className="panel watch-panel"><p className="eyebrow">ELEVATED ACTIVITY · WATCH</p><p>{recentAlerts.watch.length} locations show elevated activity below the statistical alert threshold. Continue monitoring; these are not counted as significant anomalies.</p><div className="watch-list">{recentAlerts.watch.slice(0,8).map((item,i)=><span key={i}>{item.sensor} · {item.latitude.toFixed(1)}°, {item.longitude.toFixed(1)}° · score {format(item.score)}</span>)}</div></article>}
      <div className="insight-grid" style={{ marginTop: 15 }}>
        <article className="panel anomalies"><h3>Explore historical regions</h3><label className="country-picker">Country or region<select value={id} onChange={e=>setId(e.target.value)}>{results.countries.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><p>Historical anomaly month counts are available in the baseline comparison.</p>
          {ranked.slice(0,6).map(({region,peak})=><button className="country-chip" key={region.id} onClick={()=>setId(region.id)}>{region.name}<span>{peak?.month ?? 'No flagged month'}</span></button>)}
        </article>
        {selected && <article className="panel"><div className="dashboard-toolbar"><div><h3>{selected.name}</h3><p>Historical activity vs same-month seasonal baseline. Select a country to explore.</p></div><label>Country<select value={id} onChange={e=>setId(e.target.value)}>{results.countries.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><div className="trend-chart" role="img" aria-label={`${selected.name} observed harmonized activity and seasonal baseline`}>
          {monthRows.slice(-36).map(row=><div className="trend-column" key={row.month} title={`${row.month}: observed ${format(row.evaluated_activity)}, baseline ${format(row.baseline)}, robust z ${format(row.robust_z)}`}><span className="baseline-bar" style={{height:`${Math.max(2,(row.baseline??0)/chartMax*100)}%`}}/><span className={`observed-bar ${row.anomaly?'is-anomaly':''}`} style={{height:`${Math.max(2,(row.evaluated_activity??0)/chartMax*100)}%`}}/><small>{row.month.slice(2)}</small></div>)}
          </div><div className="sensor-legend"><i className="observed-bar-key"/> Observed harmonized activity · <i className="baseline-bar-key"/> Seasonal baseline · red outline marks an unusual month</div>
          <p className="chart-caption">Each pair compares a month’s activity with the typical level for that season. Bars above the baseline indicate more detections; bars below indicate fewer. Missing months are not treated as zero.</p>
        </article>}
      </div></>}
    {intelligence?.results?.case && <article className="panel" style={{ marginTop: 16 }}>
      <p className="eyebrow">FROM SATELLITE DETECTION TO ACTION · HISTORICAL CASE STUDY</p>
      <h3>{intelligence.results.case.country} · {intelligence.results.case.month} · 2025 holdout</h3>
      <p>On {intelligence.results.case.paired_days} matched days, the actual archive contained {intelligence.results.case.raw_occupied.MODIS} MODIS and {intelligence.results.case.raw_occupied.VIIRS} VIIRS occupied cell-days. Historical factor {format(intelligence.results.case.factor)}; leave-year-out calibration median relative error {format(intelligence.results.case.calibration.validation.median_relative_error * 100)}% (uncalibrated {format(intelligence.results.case.calibration.validation.uncalibrated_median_relative_error * 100)}%), p90 {format(intelligence.results.case.calibration.validation.p90_relative_error * 100)}%. Harmonized activity {format(intelligence.results.case.activity)} vs same-month baseline {format(intelligence.results.case.baseline)}.</p>
      <p>ML novelty score {format(intelligence.results.case.score)}: {intelligence.results.case.anomaly ? 'flagged by model' : 'not flagged by model'}; seasonal baseline: {intelligence.results.case.seasonal_flag ? 'flagged' : 'not flagged'}. This example is Japan, outside the equatorial focus, and is not an incident confirmation. The recent NRT files are not used in this historical case.</p>
    </article>}
    <p className="chart-caption">Historical activity describes past detections. Neither the seasonal method nor the trained novelty model predicts future fires. Current-week alerts use per-sensor historical comparisons and no transferred cross-sensor calibration.</p>
    <section className="bioscape-embed panel"><p className="eyebrow"><Activity size={15}/> BIOSCAPE ECOLOGICAL SPATIAL EXPLORER</p><h3>BioSCape field explorer</h3><p>The original interactive explorer is preserved below, including its map, charts, filters, plot notes, and CSV export.</p><iframe title="BioSCape Interactive Ecological and Spatial Explorer" src="/bioscape.html" style={{height:bioHeight,width:'100%',border:0,borderRadius:8,background:'#100f0e'}} onLoad={event=>{try{const frame=event.currentTarget;setBioHeight(Math.max(1600,frame.contentDocument?.documentElement.scrollHeight ?? 1800))}catch{setBioHeight(2200)}}}/></section>
  </main>
}
