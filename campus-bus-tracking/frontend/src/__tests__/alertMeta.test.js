import { describe, expect, it } from 'vitest'
import { ALERT_TYPES, formatRelativeTime, getAlertMeta } from '../services/alertMeta.js'

describe('alertMeta', () => {
  it('defines the four alert semantics', () => {
    expect(ALERT_TYPES).toEqual(['DELAY', 'ROUTE_CHANGE', 'EMERGENCY', 'GENERAL'])
    expect(getAlertMeta('DELAY').borderColor).toBe('#f9ab00')
    expect(getAlertMeta('ROUTE_CHANGE').borderColor).toBe('#1a73e8')
    expect(getAlertMeta('EMERGENCY').borderColor).toBe('#d93025')
    expect(getAlertMeta('GENERAL').borderColor).toBe('#0f9d8a')
  })

  it('formats relative times and invalid values', () => {
    const now = Date.parse('2026-10-05T12:00:00Z')
    expect(formatRelativeTime('2026-10-05T11:59:30Z', now)).toBe('just now')
    expect(formatRelativeTime('2026-10-05T11:42:00Z', now)).toBe('18 min ago')
    expect(formatRelativeTime('2026-10-05T08:00:00Z', now)).toBe('4 h ago')
    expect(formatRelativeTime('not a date', now)).toBe('Time unavailable')
  })
})