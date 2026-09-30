import DemoBadge from './DemoBadge.jsx'
import { UNIVERSITY } from '../config/university.js'

function RouteCard({ route, onClick }) {
  return (
    <button
      type="button"
      className="card h-100 w-100 text-start"
      onClick={onClick}
    >
      <span className="card-body">
        <span className="d-flex justify-content-between align-items-start gap-3">
          <span className="h5 card-title mb-2">{route.route_name}</span>
          <span className="text-primary" aria-hidden="true">View</span>
        </span>
        <span className="card-text text-body-secondary d-block mb-3">
          {route.description || `${UNIVERSITY.shortName} demo route; details are not official.`}
        </span>
        <span className="d-block mb-3"><DemoBadge isVerified={route.is_verified} /></span>
        <span className="d-flex flex-wrap gap-3 small">
          <span><strong>Starts</strong> {route.start_time}</span>
          <span><strong>Ends</strong> {route.end_time}</span>
        </span>
      </span>
    </button>
  )
}

export default RouteCard