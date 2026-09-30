function DemoBadge({ isVerified = 0 }) {
  if (Number(isVerified) === 1) {
    return null
  }

  return (
    <span className="badge bg-warning-subtle text-dark border border-warning-subtle">
      Demo data - not official
    </span>
  )
}

export default DemoBadge