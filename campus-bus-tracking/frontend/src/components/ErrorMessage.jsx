function ErrorMessage({ message = 'Something went wrong. Please try again.' }) {
  return (
    <div className="alert alert-danger" role="alert">
      {message}
    </div>
  )
}

export default ErrorMessage