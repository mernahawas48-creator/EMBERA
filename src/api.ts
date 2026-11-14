export const platforms: Record<string, string> = {
  terra: 'MODIS Terra', aqua: 'MODIS Aqua', snpp: 'VIIRS Suomi NPP',
  noaa20: 'VIIRS NOAA-20', noaa21: 'VIIRS NOAA-21',
  paired: 'MODIS Aqua + VIIRS NOAA-20',
}
export const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const number = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })
export const format = (value: number | null | undefined) => value == null ? '—' : number.format(value)
export interface Region { id: string; name: string; bounds: [number, number, number, number] }
export interface Filters { region: string; start: string; end: string; demo: boolean }
export interface Coverage { start: string | null; end: string | null; demo: boolean }
export interface Month {
  month: string
  raw: Record<string, number | null>
  activity: number | null
  platform: string | null
  partial: boolean
  complete_platforms: string[]
  baseline: number | null
  evaluated_activity?: number | null
  paired_days?: number
  baseline_years: number
  robust_z: number | null
  anomaly: boolean | null
}
export interface Analysis {
  demo: boolean
  months: Month[]
  calibration: { factor: number | null; overlap_months: number; overlap_years: number; quarters: number; ratio_iqr: number[] | null;
    validation: { held_out_months: number; median_relative_error: number | null; uncalibrated_median_relative_error: number | null; p90_relative_error: number | null } }
  yearly: { year: string; activity: number | null; comparable_months: number }[]
  seasonal: { month: number; median: number | null; years: number }[]
}
export interface Point {
  id: number; latitude: number; longitude: number; utc: string; sensor: string; platform: string; weight?: number
}
export interface Hotspots { points: Point[]; next_after: number | null; aggregated?: boolean }
export function query(filters: Filters, extras?: Record<string, string>) {
  return new URLSearchParams({ ...filters, ...extras, demo: String(filters.demo) }).toString()
}
const base = '/api'
export const endpoint = (path: string) => base + path
export async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(endpoint(path), { signal })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.detail === 'string' ? body.detail : 'The data service could not complete this request.')
  }
  return response.json()
}
