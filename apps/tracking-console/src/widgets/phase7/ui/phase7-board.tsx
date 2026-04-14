import { Card } from '../../../shared/ui/card';

const phase7Checklist = [
  { status: 'done', label: 'Kickoff completed with clear scope and ownership' },
  { status: 'done', label: 'Baseline artifacts prepared and aligned in roadmap files' },
  { status: 'done', label: 'UAT scenarios and acceptance thresholds finalized' },
  { status: 'todo', label: 'Canary execution completed and monitored for agreed window' },
  { status: 'todo', label: 'Parity report reviewed and signed off' },
  { status: 'todo', label: 'Rollback rehearsal executed with evidence links' },
  { status: 'todo', label: 'Final go/no-go captured and Phase 7 moved to done' }
] as const;

export function Phase7Board() {
  return (
    <Card title="Phase 7 Cutover Control" subtitle="Operational checklist for production adoption gate">
      <ul className="status-list">
        {phase7Checklist.map((item) => (
          <li key={item.label} className={`status-item ${item.status}`}>
            <strong>{item.status === 'done' ? 'Done' : 'Pending'}</strong>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
