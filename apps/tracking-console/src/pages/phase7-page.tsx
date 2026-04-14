import { Phase7Board } from '../widgets/phase7/ui/phase7-board';
import { Card } from '../shared/ui/card';

export function Phase7Page() {
  return (
    <div className="page-grid">
      <Phase7Board />
      <Card title="Cutover execution notes" subtitle="Execution order for remaining items">
        <ol className="plain-list ordered">
          <li>Run canary rollout for agreed time window with monitor snapshots.</li>
          <li>Generate parity report from real canary vs baseline aggregate.</li>
          <li>Execute rollback rehearsal and capture operator evidence.</li>
          <li>Record final go/no-go with approval owner and timestamp.</li>
        </ol>
      </Card>
    </div>
  );
}
