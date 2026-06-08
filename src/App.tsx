import { Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "@/components/layout"
import { EventsPage } from "@/pages/events"
import { EventDashboardPage } from "@/pages/event-dashboard"
import { ExpensesPage } from "@/pages/expenses"
import { AddExpensePage } from "@/pages/add-expense"
import { ParticipantsPage } from "@/pages/participants"
import { SettlementsPage } from "@/pages/settlements"
import { SettingsPage } from "@/pages/settings"

export default function App() {
  return (
    <Routes>
      {/* Página de adicionar despesa é full-screen (sem sidebar), como na tela do Stitch */}
      <Route path="/event/:eventId/expenses/new" element={<AddExpensePage />} />
      <Route path="/event/:eventId/expenses/:expenseId/edit" element={<AddExpensePage />} />

      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<EventsPage />} />
              <Route path="/event/:eventId" element={<EventDashboardPage />} />
              <Route path="/event/:eventId/expenses" element={<ExpensesPage />} />
              <Route path="/event/:eventId/participants" element={<ParticipantsPage />} />
              <Route path="/event/:eventId/settlements" element={<SettlementsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  )
}
