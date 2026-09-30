import { useEffect, useState } from 'react'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import { UNIVERSITY } from '../config/university.js'
import { getUniversity } from '../services/universityService.js'

function AboutPage() {
  const [result, setResult] = useState({ info: null, error: '' })
  const isLoading = result.info === null && result.error === ''

  useEffect(() => {
    let isCurrent = true
    getUniversity()
      .then((info) => {
        if (isCurrent) setResult({ info, error: '' })
      })
      .catch(() => {
        if (isCurrent) {
          setResult({ info: null, error: 'Unable to load university information.' })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const info = result.info || {}
  const facts = [
    ['Also known as', info.also_known_as || UNIVERSITY.alsoKnownAs],
    ['Former name', info.former_name || UNIVERSITY.formerName],
    ['Founded', info.founded || UNIVERSITY.established],
    ['Founder', info.founder || UNIVERSITY.founder],
    ['Central university since', info.central_university_since || UNIVERSITY.centralUniversitySince],
    ['Address', info.address || UNIVERSITY.address],
    ['Campus location', info.campus_location || UNIVERSITY.description],
    ['Campus area', info.campus_area || 'Approximately 1,312.89 acres.'],
  ]
  const distances = [
    ['Sagar bus stand', info.distance_sagar_bus_stand || UNIVERSITY.distances.busStand],
    ['Saugor railway station', info.distance_saugor_railway_station || UNIVERSITY.distances.railwayStation],
    ['Dhana Airport', info.distance_dhana_airport || UNIVERSITY.distances.airport],
  ]

  return (
    <main className="container mt-4 mb-5">
      <header className="mb-4">
        <p className="text-uppercase small fw-semibold text-primary mb-1">About {UNIVERSITY.shortName}</p>
        <h1 className="h2 mb-1">{info.name_english || UNIVERSITY.englishName}</h1>
        <p className="mb-2" lang="hi">{info.name_hindi || UNIVERSITY.hindiName}</p>
        <a href={info.website || UNIVERSITY.website} target="_blank" rel="noreferrer">
          Official university website
        </a>
      </header>

      {isLoading && <Loader label="Loading university information" />}
      {result.error && <ErrorMessage message={result.error} />}

      <div className="row g-4">
        <section className="col-12 col-lg-7" aria-labelledby="university-facts-title">
          <h2 className="h4 mb-3" id="university-facts-title">University facts</h2>
          <dl className="row g-2">
            {facts.map(([label, value]) => (
              <div className="col-12" key={label}>
                <div className="border-bottom pb-2">
                  <dt className="small text-body-secondary">{label}</dt>
                  <dd className="mb-0">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <h2 className="h5 mt-4 mb-2">Facilities</h2>
          <p>{info.facilities || 'Separate hostels, resident-scholar mess, canteens, health centres, sports facilities, central library, campus Wi-Fi, computer centre, and two nationalised bank branches.'}</p>
          <h2 className="h5 mt-4 mb-2">Museum</h2>
          <p className="mb-0">
            {info.museum_location || 'Dr. Harisingh Gour museum at Valley Campus'}
            {' '}
            ({info.museum_hours || 'Monday-Saturday, 10:00 AM to 6:00 PM'})
          </p>
        </section>

        <section className="col-12 col-lg-5" aria-labelledby="how-to-reach-title">
          <h2 className="h4 mb-3" id="how-to-reach-title">How to reach</h2>
          <div className="list-group">
            {distances.map(([label, value]) => (
              <div className="list-group-item" key={label}>
                <h3 className="h6 mb-1">{label}</h3>
                <p className="mb-0 text-body-secondary">{value}</p>
              </div>
            ))}
          </div>
          <div className="alert alert-secondary mt-3 mb-0" role="note">
            Contact details: {info.security_contact || 'To be added - confirm with the Security Department'}; {info.registrar_contact || "To be added - confirm with the Registrar's office"}.
          </div>
        </section>
      </div>
    </main>
  )
}

export default AboutPage