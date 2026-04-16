import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './layout/app-shell';
import { DashboardPage } from '../pages/dashboard-page';
import { DebuggerPage } from '../pages/debugger-page';
import { EventsPage } from '../pages/events-page';
import { FlowPage } from '../pages/flow-page';
import { Phase7Page } from '../pages/phase7-page';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:eventId', element: <EventsPage /> },
      { path: 'debugger', element: <DebuggerPage /> },
      { path: 'flow', element: <FlowPage /> },
      { path: 'phase-7', element: <Phase7Page /> }
    ]
  }
]);
