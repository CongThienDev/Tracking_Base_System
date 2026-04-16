import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { AdminEventItem } from '../entities/tracking/model/admin-events';
import { trackingApi } from '../shared/api/tracking-api';
import { formatNumber } from '../shared/lib/format';

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatHealthState(status: string | undefined): string {
  if (!status) {
    return 'Unreachable';
  }

  return status.replace(/_/g, ' ');
}

function getHeartbeatTone(status: string | undefined): 'ok' | 'warn' {
  return status === 'ok' || status === 'ready' ? 'ok' : 'warn';
}

function getDeliveryMix(items: AdminEventItem[]) {
  return items.reduce(
    (summary, item) => {
      summary[item.deliveryOverallStatus] += 1;
      return summary;
    },
    { success: 0, failed: 0, queued: 0 }
  );
}

function getTopSources(items: AdminEventItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.source?.trim() || 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
}

export function DashboardPage() {
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: trackingApi.health, retry: 1, refetchInterval: 15_000 });
  const readyQuery = useQuery({ queryKey: ['ready'], queryFn: trackingApi.ready, retry: 1, refetchInterval: 15_000 });
  const metricsQuery = useQuery({ queryKey: ['metrics'], queryFn: trackingApi.metrics, retry: 1, refetchInterval: 15_000 });
  const eventsQuery = useQuery({
    queryKey: ['dashboard-recent-events'],
    queryFn: () => trackingApi.listRecentEvents({ limit: 8, offset: 0, sortBy: 'createdAt', sortDirection: 'desc' }),
    refetchInterval: 15_000
  });

  const counters = metricsQuery.data?.counters;
  const recentEvents = eventsQuery.data?.items ?? [];
  const deliveryMix = getDeliveryMix(recentEvents);
  const topSources = getTopSources(recentEvents);
  const totalRequests = counters?.track_requests_total ?? 0;
  const acceptedRequests = counters?.track_success_total ?? 0;
  const deduplicatedRequests = counters?.track_deduplicated_total ?? 0;
  const authFailures = counters?.track_auth_failed_total ?? 0;
  const rateLimited = counters?.track_rate_limited_total ?? 0;
  const validationErrors = counters?.track_validation_error_total ?? 0;
  const internalErrors = counters?.track_internal_error_total ?? 0;
  const acceptedRate = totalRequests > 0 ? `${Math.round((acceptedRequests / totalRequests) * 100)}%` : '-';
  const heartbeatTone = getHeartbeatTone(healthQuery.data?.status);

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="section-kicker">Dashboard</p>
          <h1>Tracking system</h1>
          <p className="dashboard-lead">Health, traffic, replay.</p>
        </div>
        <div className="dashboard-hero-side">
          <div className={`signal-cluster is-${heartbeatTone}`} aria-hidden="true">
            <span className="signal-beam signal-beam-a" />
            <span className="signal-beam signal-beam-b" />
            <span className="signal-core" />
          </div>
          <dl className="hero-summary-list">
            <div>
              <dt>Health</dt>
              <dd>{formatHealthState(healthQuery.data?.status)}</dd>
            </div>
            <div>
              <dt>Readiness</dt>
              <dd>{formatHealthState(readyQuery.data?.status)}</dd>
            </div>
            <div>
              <dt>Heartbeat</dt>
              <dd>{heartbeatTone === 'ok' ? 'Live' : 'Down'}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="metric-rail compact-rail" aria-label="Selected KPIs">
        <article className="metric-tile">
          <span>Accepted</span>
          <strong>{formatNumber(acceptedRequests)}</strong>
          <small>Live</small>
        </article>
        <article className="metric-tile">
          <span>Rate</span>
          <strong>{acceptedRate}</strong>
          <small>{formatNumber(totalRequests)} total</small>
        </article>
        <article className="metric-tile">
          <span>Dedup</span>
          <strong>{formatNumber(deduplicatedRequests)}</strong>
          <small>`event_id` matched</small>
        </article>
        <article className="metric-tile">
          <span>Guardrails</span>
          <strong>{formatNumber(authFailures + rateLimited)}</strong>
          <small>Auth + rate limit</small>
        </article>
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
          <section className="surface-block">
            <header className="surface-head">
              <div>
                <p className="section-kicker">Pipeline Status</p>
                <h2>Pipeline</h2>
              </div>
              <Link to="/events" className="text-action">
                Events
              </Link>
            </header>
            <div className="pipeline-grid">
              <article className="pipeline-stage heartbeat-stage">
                <span className="pipeline-index">00</span>
                <h3>Heartbeat</h3>
                <p>App health</p>
                <div className={`heartbeat-pill is-${heartbeatTone}`}>
                  <span className="heartbeat-dot" />
                  <strong>{heartbeatTone === 'ok' ? 'Healthy' : 'Unavailable'}</strong>
                </div>
              </article>
              <article className="pipeline-stage">
                <span className="pipeline-index">01</span>
                <h3>Ingress</h3>
                <p>API probes</p>
                <dl>
                  <div>
                    <dt>Health</dt>
                    <dd>{formatHealthState(healthQuery.data?.status)}</dd>
                  </div>
                  <div>
                    <dt>Readiness</dt>
                    <dd>{formatHealthState(readyQuery.data?.status)}</dd>
                  </div>
                </dl>
              </article>
              <article className="pipeline-stage">
                <span className="pipeline-index">02</span>
                <h3>Validation</h3>
                <p>Payload checks</p>
                <dl>
                  <div>
                    <dt>Validation errors</dt>
                    <dd>{formatNumber(validationErrors)}</dd>
                  </div>
                  <div>
                    <dt>Internal errors</dt>
                    <dd>{formatNumber(internalErrors)}</dd>
                  </div>
                </dl>
              </article>
              <article className="pipeline-stage">
                <span className="pipeline-index">03</span>
                <h3>Delivery</h3>
                <p>Recent outcomes</p>
                <dl>
                  <div>
                    <dt>Success</dt>
                    <dd>{formatNumber(deliveryMix.success)}</dd>
                  </div>
                  <div>
                    <dt>Queued / failed</dt>
                    <dd>
                      {formatNumber(deliveryMix.queued)} / {formatNumber(deliveryMix.failed)}
                    </dd>
                  </div>
                </dl>
              </article>
            </div>
          </section>

          <section className="surface-block">
            <header className="surface-head">
              <div>
                <p className="section-kicker">Live Event Feed</p>
                <h2>Latest events</h2>
              </div>
              <Link to="/debugger" className="text-action">
                Debugger
              </Link>
            </header>
            {eventsQuery.isLoading ? <p className="dashboard-empty">Loading…</p> : null}
            {!eventsQuery.isLoading && recentEvents.length === 0 ? (
              <p className="dashboard-empty">No data.</p>
            ) : null}
            {recentEvents.length > 0 ? (
              <div className="feed-list">
                {recentEvents.map((item) => (
                  <Link key={item.eventId} to={`/events/${item.eventId}`} className="feed-row">
                    <div className="feed-row-main">
                      <strong>{item.eventName}</strong>
                      <span>{item.eventId}</span>
                    </div>
                    <div className="feed-row-meta">
                      <span>{item.source ?? 'unknown source'}</span>
                      <span className={`status-pill ${item.deliveryOverallStatus}`}>{item.deliveryOverallStatus}</span>
                      <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt)}</time>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="workspace-side">
          <section className="surface-block compact-surface">
            <header className="surface-head">
              <div>
                <p className="section-kicker">Traffic</p>
                <h2>Sources</h2>
              </div>
            </header>
            {topSources.length > 0 ? (
              <div className="source-list">
                {topSources.map(([source, count]) => (
                  <div key={source} className="source-row">
                    <span>{source}</span>
                    <strong>{formatNumber(count)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dashboard-empty">No data.</p>
            )}
          </section>

          <section className="surface-block compact-surface">
            <header className="surface-head">
              <div>
                <p className="section-kicker">Protection</p>
                <h2>Guardrails</h2>
              </div>
            </header>
            <div className="guardrail-list">
              <div>
                <span>Auth failed</span>
                <strong>{formatNumber(authFailures)}</strong>
              </div>
              <div>
                <span>Rate limited</span>
                <strong>{formatNumber(rateLimited)}</strong>
              </div>
              <div>
                <span>Deduplicated</span>
                <strong>{formatNumber(deduplicatedRequests)}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
