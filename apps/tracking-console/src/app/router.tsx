import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './layout/app-shell';
import { DebuggerPage } from '../pages/debugger-page';
import { EventsPage } from '../pages/events-page';
import { FlowPage } from '../pages/flow-page';
import { OverviewPage } from '../pages/overview-page';
import { Phase7Page } from '../pages/phase7-page';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:eventId', element: <EventsPage /> },
      { path: 'debugger', element: <DebuggerPage /> },
      { path: 'flow', element: <FlowPage /> },
      { path: 'phase-7', element: <Phase7Page /> }
    ]
  }
]);
