import { SystemHealthPanel } from '../widgets/system-health/ui/system-health-panel';
import { Phase7Board } from '../widgets/phase7/ui/phase7-board';
import { Card } from '../shared/ui/card';

export function OverviewPage() {
  return (
    <div className="page-grid">
      <Card
        title="What this frontend is for"
        subtitle="Operations console for tracking integrity, not an end-user analytics product"
      >
        <ul className="plain-list">
          <li>Observe runtime status of tracking-api and readiness probes.</li>
          <li>Debug event contract quickly by posting test payloads.</li>
          <li>Track Phase 7 cutover gate status in one place for go/no-go decisions.</li>
        </ul>
      </Card>
      <SystemHealthPanel />
      <Phase7Board />
    </div>
  );
}
