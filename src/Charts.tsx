import { arc } from 'd3'
import { useId, useMemo, useRef } from 'react'
import { Download } from 'lucide-react'
import { format, monthNames, type Month } from './api'

const EMPTY = '#25221f'
const PAPER = '#181613'
const INK = '#f0e5d4'
const MUTED = '#a59b8c'

export function downloadSvg(svg: SVGSVGElement | null, name: string) {
  if (!svg) return
  const copy = svg.cloneNode(true) as SVGSVGElement
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const blob = new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = name + '.svg'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

function pattern(id: string) {
  return <defs><pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="5" height="5" fill={EMPTY} /><line stroke="#51473f" strokeWidth="1" y2="5" />
  </pattern></defs>
}
export function Colors({ max, metric }: { max: number; metric: string }) {
  return <div className="legend" aria-label={`${metric} scale from zero to ${format(max)}`}><i className="legend-zero" /><span>0</span>{[.25,.5,.75,1].map((fraction, i) => <span className="legend-step" key={fraction}><i style={{ background: HEAT[i] }} />{format(max * fraction)} {i === 3 ? metric : ''}</span>)}<i className="legend-missing" /><span>Missing</span><i className="legend-anomaly" /><span>Verified anomaly</span></div>
}
const HEAT = ['#71543b', '#b17836', '#df8640', '#f1b95c']
export function heat(value: number | null, max: number) {
  if (value == null) return EMPTY
  if (value === 0) return '#392621'
  return HEAT[Math.min(3, Math.floor(value / Math.max(max, 1) * 4))]
}

interface ChartProps {
  years: string[]; byMonth: Map<string, Month>; active: string; onSelect: (month: string) => void
  metric: string; value: (row?: Month) => number | null; max: number; demo: boolean
}

export function Rings({ years, byMonth, active, onSelect, metric, value, max, demo }: ChartProps) {
  const svg = useRef<SVGSVGElement>(null)
  const id = useId()
  const shownYears = years.slice(-32)
  const width = 104 / Math.max(shownYears.length, 1)
  const generator = useMemo(() => arc().cornerRadius(1), [])
  return <>
    <div className="chart-tools"><button className="small-button" onClick={() => downloadSvg(svg.current, demo ? 'memory-rings-demo' : 'memory-rings')}><Download size={14} /> SVG</button></div>
    <svg ref={svg} className="ring-svg" width="350" height="338" viewBox="0 0 350 338" fontFamily="monospace" aria-label="Concentric annual timelines. Select a month to inspect it.">
      <title>Fire Memory Rings · {metric}{demo ? ' · Synthetic demo' : ''}</title>
      <rect width="350" height="338" fill={PAPER} />
      {pattern(id)}
      <g transform="translate(175 164)">
        <circle r="146" fill="none" stroke="#3d342b" strokeDasharray="2 5" />
        <circle r="34" fill="none" stroke="#3d342b" />
        {monthNames.map((name, i) => {
          const angle = (i + .5) * Math.PI / 6
          return <text key={name} x={Math.sin(angle) * 161} y={-Math.cos(angle) * 155 + 3} textAnchor="middle" fill={MUTED} fontSize="9">{name.toUpperCase()}</text>
        })}
        {shownYears.flatMap((year, yi) => monthNames.map((_, i) => {
          const month = `${year}-${String(i + 1).padStart(2, '0')}`
          const row = byMonth.get(month)
          const amount = value(row)
          const label = `${month}: ${format(amount)} ${amount == null ? 'unavailable' : metric}`
          return <path key={month} d={generator({
            innerRadius: 38 + yi * width, outerRadius: 38 + (yi + 1) * width - Math.min(1.4, width * .24),
            startAngle: i * Math.PI / 6 + .013, endAngle: (i + 1) * Math.PI / 6 - .013,
          }) || undefined} fill={amount == null ? `url(#${id})` : heat(amount, max)}
            stroke={active === month ? '#ffefd1' : 'none'} strokeWidth="1.1"
            className={row ? 'ring-segment' : undefined} role={row ? 'button' : undefined}
            tabIndex={row ? 0 : undefined} aria-label={label} aria-pressed={row ? active === month : undefined}
            onClick={() => row && onSelect(month)} onKeyDown={event => {
              if (row && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(month) }
            }}><title>{label}</title></path>
        }))}
        <text y="-1" textAnchor="middle" fill={INK} fontSize="16">{format(value(byMonth.get(active)))}</text>
        <text y="14" textAnchor="middle" fill={MUTED} fontSize="9">{active || 'NO MONTH'}</text>
      </g>
      <text x="175" y="333" textAnchor="middle" fill={MUTED} fontSize="8">{demo ? 'SYNTHETIC DEMO · ' : ''}{metric.toUpperCase()} · 0–{format(max)}</text>
    </svg>
    <p className="chart-caption">{shownYears.length ? `${shownYears[0]} at center · ${shownYears.at(-1)} at rim` : 'Select a range to display the rings.'}{years.length > 32 && ' · Latest 32 years shown in rings'}</p>
  </>
}

export function Calendar({ years, byMonth, active, onSelect, metric, value, max, demo }: ChartProps) {
  const svg = useRef<SVGSVGElement>(null)
  const id = useId()
  return <>
    <div className="chart-tools"><button className="small-button" onClick={() => downloadSvg(svg.current, demo ? 'burning-calendar-demo' : 'burning-calendar')}><Download size={14} /> SVG</button></div>
    <div className="calendar-scroll">
      <svg ref={svg} width="514" height={Math.max(68, 62 + years.length * 25)} className="calendar-svg"
        viewBox={`0 0 514 ${Math.max(68, 62 + years.length * 25)}`} fontFamily="monospace" aria-label="Monthly burning calendar">
        <title>Burning Calendar · {metric}{demo ? ' · Synthetic demo' : ''}</title>
        <rect width="100%" height="100%" fill={PAPER} />
        {pattern(id)}
        {monthNames.map((name, i) => <text key={name} x={65 + i * 37} y="17" textAnchor="middle" fill={MUTED} fontSize="11">{name}</text>)}
        {[...years].reverse().map((year, yi) => <g key={year} transform={`translate(0 ${29 + yi * 25})`}>
          <text x="2" y="14" fill={MUTED} fontSize="11">{year}</text>
          {monthNames.map((_, i) => {
            const month = `${year}-${String(i + 1).padStart(2, '0')}`
            const row = byMonth.get(month)
            const amount = value(row)
            const label = `${month}: ${amount == null ? 'unavailable' : `${format(amount)} ${metric}`}`
            return <rect key={month} x={48 + i * 37} width="34" height="20" rx="2"
              fill={amount == null ? `url(#${id})` : heat(amount, max)} stroke={month === active ? '#ffefd1' : row?.anomaly ? '#ff5666' : 'none'} strokeWidth={row?.anomaly ? 2 : 1}
              role={row ? 'button' : undefined} tabIndex={row ? 0 : undefined} aria-label={label}
              aria-pressed={row ? month === active : undefined} className={row ? 'ring-segment' : undefined}
              onClick={() => row && onSelect(month)} onKeyDown={event => {
                if (row && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(month) }
              }}><title>{label}</title></rect>
          })}
        </g>)}
        <text x="2" y={49 + years.length * 25} fill={MUTED} fontSize="10">{demo ? 'Synthetic demo · ' : ''}{metric} · Scale 0 to {format(max)} · Hatched = unavailable</text>
      </svg>
    </div>
    <Colors max={max} metric={metric} />
  </>
}

export function Bars({ values, label, demo }: { values: { name: string; value: number | null; detail: string }[]; label: string; demo: boolean }) {
  const svg = useRef<SVGSVGElement>(null)
  const width = Math.max(390, values.length * 40 + 44)
  const max = Math.max(1, ...values.map(v => v.value ?? 0))
  const gap = (width - 44) / Math.max(1, values.length)
  return <>
    <div className="chart-tools"><button className="small-button" onClick={() => downloadSvg(svg.current, label.toLowerCase().replaceAll(' ', '-') + (demo ? '-demo' : ''))}><Download size={14} /> SVG</button></div>
    <div className="calendar-scroll">
      <svg ref={svg} width={width} height="158" viewBox={`0 0 ${width} 158`} fontFamily="monospace" aria-label={label}>
        <title>{label}{demo ? ' · Synthetic demo' : ''}</title><rect width="100%" height="100%" fill={PAPER} />
        <text x="2" y="15" fontSize="9" fill={MUTED}>{format(max)}</text>
        <line x1="43" y1="110" x2={width} y2="110" stroke="#605244" />
        {values.map(({ name, value, detail }, i) => {
          const height = value == null ? 0 : value / max * 92
          return <g key={name} transform={`translate(${44 + gap * i} 0)`}>
            {value == null ? <text x={gap / 2} y="101" textAnchor="middle" fill={MUTED} fontSize="10">—</text> :
              <rect x={gap * .19} width={gap * .62} height={height} y={110 - height} rx="2" fill={heat(value, max)} />}
            <text x={gap / 2} y="128" textAnchor="middle" fill={MUTED} fontSize="9">{name}</text>
            <title>{name}: {format(value)} · {detail}</title>
          </g>
        })}
        <text x="2" y="151" fill={MUTED} fontSize="9">{demo ? 'Synthetic demo · ' : ''}Activity index · — unavailable</text>
      </svg>
    </div>
  </>
}
