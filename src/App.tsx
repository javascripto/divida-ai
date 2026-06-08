import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { AddExpensePage } from '@/pages/add-expense';
import { EventDashboardPage } from '@/pages/event-dashboard';
import { EventsPage } from '@/pages/events';
import { ExpensesPage } from '@/pages/expenses';
import { ParticipantsPage } from '@/pages/participants';
import { SettingsPage } from '@/pages/settings';
import { SettlementsPage } from '@/pages/settlements';

/**
 * Força a remontagem da página quando o alvo da rota muda.
 *
 * O React reaproveita a mesma instância do componente quando navegamos entre
 * duas URLs que casam com o mesmo padrão de rota (ex.: /event/A/... → /event/B/...).
 * Sem isso, estados locais derivados do evento (formulário de despesa, filtros,
 * painéis abertos) vazam de um evento para outro. Trocar a `key` descarta o
 * estado antigo e recria o componente com os dados do evento correto.
 */
function Keyed({ children }: { children: ReactNode }) {
  const { eventId, expenseId } = useParams();
  return (
    <div
      key={`${eventId ?? ''}:${expenseId ?? ''}`}
      className="contents"
    >
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Página de adicionar despesa é full-screen (sem sidebar), como na tela do Stitch */}
      <Route
        path="/event/:eventId/expenses/new"
        element={
          <Keyed>
            <AddExpensePage />
          </Keyed>
        }
      />
      <Route
        path="/event/:eventId/expenses/:expenseId/edit"
        element={
          <Keyed>
            <AddExpensePage />
          </Keyed>
        }
      />

      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route
                path="/"
                element={<EventsPage />}
              />
              <Route
                path="/event/:eventId"
                element={
                  <Keyed>
                    <EventDashboardPage />
                  </Keyed>
                }
              />
              <Route
                path="/event/:eventId/expenses"
                element={
                  <Keyed>
                    <ExpensesPage />
                  </Keyed>
                }
              />
              <Route
                path="/event/:eventId/participants"
                element={
                  <Keyed>
                    <ParticipantsPage />
                  </Keyed>
                }
              />
              <Route
                path="/event/:eventId/settlements"
                element={
                  <Keyed>
                    <SettlementsPage />
                  </Keyed>
                }
              />
              <Route
                path="/settings"
                element={<SettingsPage />}
              />
              <Route
                path="*"
                element={
                  <Navigate
                    to="/"
                    replace
                  />
                }
              />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}
