// Turns an axios failure into something worth showing a user. Mobile
// connections drop constantly, so pages surface a readable message instead of
// failing silently or throwing an unhandled rejection.
export function describeError(err, fallback = 'Something went wrong') {
  if (!err) return fallback
  if (err.response) {
    return err.response.data?.error || `Request failed (${err.response.status})`
  }
  if (err.request) {
    return 'Cannot reach the server. Check your connection and that the API is running.'
  }
  return err.message || fallback
}
