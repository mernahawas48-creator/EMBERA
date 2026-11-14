import { useEffect, useState } from 'react'
import { api, endpoint, format, platforms, query, type Filters } from './api'
import { heat, Colors } from './Charts'

interface Day { day: string; activity: number | null; raw: Record<string, number | null> }

export default function DailyCalendar({ filters, month, metric, onSelect }: {
  filters: Filters; month: string; metric: string; onSelect: (day: string) => void
}) {
  const [days, setDays] = useState<Day[]>([])
  const [status, setStatus] = useState('')
  const [year, monthIndex] = month.split('-').map(Number)
  const start = [filters.start, month + '-01'].sort()[1]
  const end = [filters.end, month + '-' + new Date(Date.UTC(year, monthIndex, 0)).getUTCDate()].sort()[0]
  const search = query({ ...filters, start, end })
  useEffect(() => {
    const controller = new AbortController()
    setDays([])
    setStatus('Loading days…')
    api<{ days: Day[] }>('/calendar/daily?' + search, controller.signal)
      .then(result => { setDays(result.days); setStatus('') })
      .catch(error => { if (!controller.signal.aborted) setStatus(error.message) })
    return () => controller.abort()
  }, [search])
  const value = (day: Day) => {
    if (metric === 'activity') return day.activity
    const counts = Object.entries(day.raw).filter(([key, count]) => (key === metric || platforms[key]?.startsWith(metric)) && count !== null)
    return counts.length ? counts.reduce((sum, [, count]) => sum + (count ?? 0), 0) : null
  }
  const max = Math.max(0, ...days.map(day => value(day) ?? 0))
  return <div className="daily-calendar">
    <h4>Daily activity · {month}</h4>
    {status && <p role="status">{status}</p>}
    <div className="day-grid">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
      {days.map((day, i) => <button key={day.day} type="button" onClick={() => onSelect(day.day)}
        style={{ gridColumnStart: i ? undefined : ((new Date(day.day).getUTCDay() + 6) % 7) + 1,
          background: value(day) === null ? 'repeating-linear-gradient(45deg,#51473f 0 1px,#25221f 1px 5px)' : heat(value(day), max),
          color: value(day) !== null && max && (value(day) ?? 0) / max > .35 ? '#21130e' : '#fff0df' }}
        aria-label={day.day + ': ' + (value(day) === null ? 'unavailable' : format(value(day)))}
        title={day.day + ' · ' + (value(day) === null ? 'Unavailable' : format(value(day)))}>{Number(day.day.slice(-2))}</button>)}
    </div>
    <Colors max={max} metric={metric === 'activity' ? 'Activity index' : metric + ' detections'} />
    <a className="small-button" href={endpoint('/exports/daily.csv?' + search)}>Daily CSV</a>
  </div>
}
