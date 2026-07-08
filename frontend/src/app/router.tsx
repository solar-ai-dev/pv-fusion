import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminRoute } from '../features/auth/components/AdminRoute'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'
import { AdminPage } from '../pages/AdminPage'
import { DashboardOverviewPage } from '../pages/DashboardOverviewPage'
import { ForbiddenPage } from '../pages/ForbiddenPage'
import { InspectionDetailPage } from '../pages/InspectionDetailPage'
import { InspectionListPage } from '../pages/InspectionListPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PendingApprovalPage } from '../pages/PendingApprovalPage'
import { PlantDetailPage } from '../pages/PlantDetailPage'
import { PlantsPage } from '../pages/PlantsPage'
import { ResultDetailPage } from '../pages/ResultDetailPage'
import { ResultListPage } from '../pages/ResultListPage'
import { TrackingPage } from '../pages/TrackingPage'
import { ZoneDetailPage } from '../pages/ZoneDetailPage'
import { AppLayout } from '../shared/components/layout/AppLayout'
import { AuthLayout } from '../shared/components/layout/AuthLayout'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pending" element={<PendingApprovalPage />} />
      </Route>

      <Route path="/forbidden" element={<ForbiddenPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardOverviewPage />} />

        {/* 발전소·구역 */}
        <Route path="/plants" element={<PlantsPage />} />
        <Route path="/plants/:plantId" element={<PlantDetailPage />} />
        <Route path="/zones/:zoneId" element={<ZoneDetailPage />} />

        {/* 점검 */}
        <Route path="/inspections" element={<InspectionListPage />} />
        <Route path="/inspections/:inspectionId" element={<InspectionDetailPage />} />

        {/* 결과 */}
        <Route path="/results" element={<ResultListPage />} />
        <Route path="/results/:resultId" element={<ResultDetailPage />} />

        {/* 변화 추적 (낮은 우선순위) */}
        <Route path="/tracking" element={<TrackingPage />} />

        {/* 관리자 */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
