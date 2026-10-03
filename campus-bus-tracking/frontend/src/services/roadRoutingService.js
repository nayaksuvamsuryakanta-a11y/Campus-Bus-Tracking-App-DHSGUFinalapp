const ROUTING_TIMEOUT_MS = 6000

export async function fetchRoadRoute(stops) {
  let timeoutId
  try {
    if (!Array.isArray(stops) || stops.length < 2) return null

    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS)
    const waypoints = stops
      .map((stop) => `${stop.longitude},${stop.latitude}`)
      .join(';')
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&alternatives=false&steps=false`,
      { signal: controller.signal },
    )
    if (!response.ok) return null

    const result = await response.json()
    const route = result?.code === 'Ok' ? result.routes?.[0] : null
    if (
      !Array.isArray(route?.geometry?.coordinates)
      || !Number.isFinite(route.distance)
      || !Number.isFinite(route.duration)
    ) {
      return null
    }

    return {
      coordinates: route.geometry.coordinates,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    }
  } catch {
    return null
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}