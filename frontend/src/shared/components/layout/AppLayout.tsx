import { Outlet } from 'react-router-dom'
import { Breadcrumb } from './Breadcrumb'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'

export function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <TopNavbar />
        <div className="app-body">
          <Breadcrumb />
          <Outlet />
        </div>
      </div>
    </div>
  )
}
