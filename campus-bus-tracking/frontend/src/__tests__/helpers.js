import { createElement } from 'react'
import { vi } from 'vitest'

export const mockMap = {
  flyTo: vi.fn(),
  invalidateSize: vi.fn(),
}

function mockContainer(testId, props = {}) {
  return function MockContainer({ children, ...componentProps }) {
    const markerProps = Object.fromEntries(
      Object.entries(componentProps).filter(([key]) => key !== 'children'),
    )
    return createElement(
      'div',
      {
        'data-testid': testId,
        ...props(componentProps, markerProps),
      },
      children,
    )
  }
}

export function createReactLeafletMock() {
  return {
    MapContainer: mockContainer('map', (props) => ({
      'data-center': JSON.stringify(props.center),
      'data-zoom': props.zoom,
    })),
    TileLayer: mockContainer('tile-layer', (props) => ({
      'data-url': props.url,
      'data-attribution': props.attribution,
    })),
    Marker: mockContainer('marker', (props) => ({
      'data-position': JSON.stringify(props.position),
      'data-icon-html': props.icon?.html || '',
    })),
    Popup: ({ children }) => createElement('div', { 'data-testid': 'popup' }, children),
    CircleMarker: mockContainer('circle-marker', (props) => ({
      'data-center': JSON.stringify(props.center),
      'data-radius': props.radius,
      'data-path-options': JSON.stringify(props.pathOptions),
    })),
    Polyline: mockContainer('polyline', (props) => ({
      'data-positions': JSON.stringify(props.positions),
      'data-path-options': JSON.stringify(props.pathOptions),
    })),
    useMap: () => mockMap,
  }
}

export function createLeafletMock() {
  return {
    default: {
      Icon: {
        Default: {
          prototype: {},
          mergeOptions: vi.fn(),
        },
      },
      divIcon: vi.fn((options) => ({ type: 'divIcon', ...options })),
      icon: vi.fn((options) => ({ type: 'icon', ...options })),
    },
  }
}

const originalGeolocationDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  'geolocation',
)

function setGeolocation(getCurrentPosition) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  })
  return getCurrentPosition
}

export function mockGeolocationSuccess(
  coords = { latitude: 23.8276, longitude: 78.7708 },
) {
  return setGeolocation(vi.fn((success) => success({ coords })))
}

export function mockGeolocationPermissionDenied() {
  return setGeolocation(vi.fn((success, failure) => failure({ code: 1 })))
}

export function resetGeolocationMock() {
  if (originalGeolocationDescriptor) {
    Object.defineProperty(navigator, 'geolocation', originalGeolocationDescriptor)
  } else {
    delete navigator.geolocation
  }
}