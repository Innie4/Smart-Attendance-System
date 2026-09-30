/**
 * Where each role belongs.
 *
 * Centralised so the login page, the route guard and the root redirect all
 * agree. They previously disagreed: a lecturer was sent to /admin, which is
 * admin-only, so the guard bounced them back to /admin forever and the page
 * never rendered.
 */

const HOME_BY_ROLE = {
  student: '/portal',
  lecturer: '/lecturer',
  admin: '/admin',
}

export function homeRouteFor(role) {
  return HOME_BY_ROLE[role] || '/login'
}

export function canAccess(role, allowedRoles) {
  if (!allowedRoles) return true
  return allowedRoles.includes(role)
}

// Prefix groups so a destination can be checked against the signed-in role
// without duplicating the routing table.
const AREA_BY_ROLE = {
  student: ['/portal'],
  lecturer: ['/lecturer'],
  admin: ['/admin', '/lecturer'],
}

export function isAllowedDestination(path, role) {
  if (typeof path !== 'string' || path === '/' || !path.startsWith('/')) return false
  const areas = AREA_BY_ROLE[role] || []
  return areas.some((area) => path === area || path.startsWith(`${area}/`))
}
