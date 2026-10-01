import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { resetGeolocationMock } from './helpers.js'

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  resetGeolocationMock()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})