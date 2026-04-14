import { Card } from '../../../shared/ui/card';

const flow = [
  ['Client App', 'Browser or backend service emits event'],
  ['Tracking API', 'Validate and enrich payload via POST /track'],
  ['Postgres', 'Store canonical event with dedup by event_id'],
  ['Queue', 'BullMQ + Redis dispatches async routing jobs'],
  ['Router Worker', 'Adapter mapping, retry policy, delivery state'],
  ['Destinations', 'Meta, Google, TikTok receive conversion payloads']
] as const;

export function FlowMap() {
  return (
    <Card title="System Flow Explorer" subtitle="One event lifecycle from ingestion to vendor delivery">
      <div className="flow-wrap">
        {flow.map(([title, desc], index) => (
          <div key={title} className="flow-node">
            <strong>{`${index + 1}. ${title}`}</strong>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
