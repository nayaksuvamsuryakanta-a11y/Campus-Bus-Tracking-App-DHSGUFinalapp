const ROUTING_TIMEOUT_MS = 6000

function haversineDistanceKm(start, end) {
  const radians = Math.PI / 180
  const latitude1 = Number(start.latitude) * radians
  const latitude2 = Number(end.latitude) * radians
  const latitudeDelta = latitude2 - latitude1
  const longitudeDelta = (Number(end.longitude) - Number(start.longitude)) * radians
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

async function fetchRoadCandidate(start, end, directDistanceKm, detourFactor, extraKm) {
  let timeoutId

  try {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS)
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`,
      { signal: controller.signal },
    )
    if (!response.ok) {
      return null
    }

    const result = await response.json()
    const route = result?.code === 'Ok' ? result.routes?.[0] : null
    const coordinates = route?.geometry?.coordinates
    const roadDistanceKm = route?.distance / 1000
    const maxRoadDistanceKm = Math.max(
      detourFactor * directDistanceKm,
      directDistanceKm + extraKm,
    )
    const validCoordinates = Array.isArray(coordinates)
      && coordinates.length >= 2
      && coordinates.every((coordinate) => (
        Array.isArray(coordinate)
        && coordinate.length >= 2
        && Number.isFinite(coordinate[0])
        && Number.isFinite(coordinate[1])
      ))

    if (
      !validCoordinates
      || !Number.isFinite(roadDistanceKm)
      || roadDistanceKm < 0
      || roadDistanceKm > maxRoadDistanceKm
    ) {
      return null
    }

    return { coordinates, distanceKm: roadDistanceKm, roadUsed: true }
  } catch {
    return null
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

async function fetchRoadSegment(start, end) {
  const directDistanceKm = haversineDistanceKm(start, end)
  const straightCoordinates = [
    [Number(start.longitude), Number(start.latitude)],
    [Number(end.longitude), Number(end.latitude)],
  ]
  const strictCandidate = await fetchRoadCandidate(start, end, directDistanceKm, 2.2, 3)
  if (strictCandidate) return strictCandidate

  const relaxedCandidate = await fetchRoadCandidate(start, end, directDistanceKm, 3.5, 5)
  return relaxedCandidate || {
    coordinates: straightCoordinates,
    distanceKm: directDistanceKm,
    roadUsed: false,
  }
}

export async function fetchRoadRoute(stops) {
  if (
    !Array.isArray(stops)
    || stops.length < 2
    || stops.some((stop) => (
      !Number.isFinite(Number(stop.latitude))
      || !Number.isFinite(Number(stop.longitude))
    ))
  ) {
    return null
  }

  const segments = await Promise.all(
    stops.slice(1).map((stop, index) => fetchRoadSegment(stops[index], stop)),
  )
  const coordinates = []
  let distanceKm = 0
  let roadUsed = false

  for (const segment of segments) {
    distanceKm += segment.distanceKm
    roadUsed ||= segment.roadUsed
    for (const coordinate of segment.coordinates) {
      const previous = coordinates[coordinates.length - 1]
      if (previous?.[0] === coordinate[0] && previous?.[1] === coordinate[1]) continue
      coordinates.push(coordinate)
    }
  }

  return {
    coordinates,
    distanceKm,
    durationMin: (distanceKm / 20) * 60,
    roadUsed,
  }
}