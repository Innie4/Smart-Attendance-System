import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Aurora from './Aurora.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function Layout() {
  const [navOpen, setNavOpen] = useState(false)

  const closeNav = useCallback(() => setNavOpen(false), [])
  const toggleNav = useCallback(() => setNavOpen((prev) => !prev), [])

  // Rotating to a wide viewport leaves the drawer stranded off-screen with the
  // page still locked, so reset once we are back on the desktop layout.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const handleChange = (event) => {
      if (event.matches) setNavOpen(false)
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return (
    <div className="relative flex h-dvh">
      <Aurora />
      <Sidebar open={navOpen} onClose={closeNav} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={toggleNav} navOpen={navOpen} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-9">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}