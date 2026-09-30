import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import RouteCard from '../components/RouteCard.jsx'
import { getRoutes } from '../services/busService.js'

function RoutesPage() {
  const navigate = useNavigate()
  const [routes, setRoutes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    getRoutes()
      .then((data) => {
        if (isCurrent) setRoutes(data)
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            requestError.response?.data?.error ||
              'Unable to load routes. Check that the backend is running.',
          )
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <main className="container mt-4 mb-5">
      <header className="mb-4">
        <h1 className="h2 mb-1">Bus routes</h1>
        <p className="text-body-secondary mb-0">Choose a route to view its stops and schedule.</p>
      </header>
      {isLoading && <Loader label="Loading routes" />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && !error && routes.length === 0 && (
        <p className="text-body-secondary">No routes are available.</p>
      )}
      {!isLoading && !error && routes.length > 0 && (
        <div className="row g-3">
          {routes.map((route) => (
            <div className="col-12 col-md-6 col-xl-4" key={route.id}>
              <RouteCard
                route={route}
                onClick={() => navigate(`/routes/${route.id}`)}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default RoutesPage