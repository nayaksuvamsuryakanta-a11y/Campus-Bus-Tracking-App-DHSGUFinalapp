import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DemoBadge from '../components/DemoBadge.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import { getPlaces } from '../services/placeService.js'

const CATEGORIES = [
  'ALL', 'GATE', 'HOSTEL', 'ACADEMIC', 'LIBRARY', 'AUDITORIUM', 'HEALTH',
  'BANK', 'CANTEEN', 'SPORTS', 'GARDEN', 'MUSEUM', 'SCHOOL', 'SECURITY', 'OTHER',
]

function PlacesPage() {
  const [category, setCategory] = useState('ALL')
  const [result, setResult] = useState({ category: null, places: [], error: '' })
  const isLoading = result.category !== category
  const places = result.category === category ? result.places : []
  const error = result.category === category ? result.error : ''

  useEffect(() => {
    let isCurrent = true
    getPlaces(category === 'ALL' ? undefined : category)
      .then((data) => {
        if (isCurrent) setResult({ category, places: data, error: '' })
      })
      .catch(() => {
        if (isCurrent) {
          setResult({ category, places: [], error: 'Unable to load campus places.' })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [category])

  return (
    <main className="container mt-4 mb-5">
      <header className="mb-4">
        <h1 className="h2 mb-1">Campus places</h1>
        <p className="text-body-secondary mb-0">University landmarks and facilities. Unconfirmed map pins are labeled.</p>
      </header>

      <div className="d-flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter places by category">
        {CATEGORIES.map((item) => (
          <button
            className={`btn btn-sm ${category === item ? 'btn-primary' : 'btn-outline-secondary'}`}
            type="button"
            key={item}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item === 'ALL' ? 'All places' : item.replaceAll('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading && <Loader label="Loading campus places" />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && !error && places.length === 0 && (
        <p className="text-body-secondary">No places found in this category.</p>
      )}
      {!isLoading && !error && places.length > 0 && (
        <div className="row g-3">
          {places.map((place) => (
            <div className="col-12 col-md-6 col-xl-4" key={place.id}>
              <article className="card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <h2 className="h5 card-title mb-0">{place.name}</h2>
                    <span className="badge bg-secondary">{place.category}</span>
                  </div>
                  <p className="card-text text-body-secondary">{place.description}</p>
                  <div className="mb-3"><DemoBadge isVerified={place.is_verified} /></div>
                  {place.notes && <p className="small text-body-secondary mt-auto">{place.notes}</p>}
                  <Link className="btn btn-outline-primary mt-auto align-self-start" to={`/live-map?place=${place.id}`}>
                    Show on map
                  </Link>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default PlacesPage