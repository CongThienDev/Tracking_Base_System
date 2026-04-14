import { useQuery } from '@tanstack/react-query';
import { trackingApi } from '../../../shared/api/tracking-api';
import { formatNumber } from '../../../shared/lib/format';
import { Card } from '../../../shared/ui/card';

export function SystemHealthPanel() {
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: trackingApi.health, retry: 1 });
  const readyQuery = useQuery({ queryKey: ['ready'], queryFn: trackingApi.ready, retry: 1 });
  const metricsQuery = useQuery({ queryKey: ['metrics'], queryFn: trackingApi.metrics, retry: 1 });

  return (
    <Card title="Runtime Health" subtitle="Live probes against tracking-api via /health, /ready, /metrics">
      <div className="kpi-grid">
        <article className="kpi-card">
          <span>Health</span>
          <strong>{healthQuery.data?.status ?? 'unreachable'}</strong>
        </article>
        <article className="kpi-card">
          <span>Readiness</span>
          <strong>{readyQuery.data?.status ?? 'unreachable'}</strong>
        </article>
        <article className="kpi-card">
          <span>Ingest accepted</span>
          <strong>{formatNumber(metricsQuery.data?.counters?.track_success_total)}</strong>
        </article>
        <article className="kpi-card">
          <span>Dedup hits</span>
          <strong>{formatNumber(metricsQuery.data?.counters?.track_deduplicated_total)}</strong>
        </article>
      </div>
      {metricsQuery.error ? (
        <p className="hint warn">Metrics endpoint unavailable. Start API with metrics enabled to see counters.</p>
      ) : null}
    </Card>
  );
}
