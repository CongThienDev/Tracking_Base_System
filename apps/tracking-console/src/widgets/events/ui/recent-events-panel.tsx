import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trackingApi } from '../../../shared/api/tracking-api';
import type { DeliveryState } from '../../../entities/tracking/model/admin-events';
import { Card } from '../../../shared/ui/card';

type DeliveryOverallStatusFilter = 'all' | 'queued' | 'success' | 'failed';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function normalizeDeliveryState(status: DeliveryState['status']): 'queued' | 'success' | 'failed' {
  if (status === 'failed') {
    return 'failed';
  }

  if (status === 'delivered') {
    return 'success';
  }

  return 'queued';
}

function statusClass(status: 'queued' | 'success' | 'failed') {
  if (status === 'success') {
    return 'status-pill success';
  }

  if (status === 'failed') {
    return 'status-pill failed';
  }

  return 'status-pill queued';
}

export function RecentEventsPanel() {
  const [offset, setOffset] = useState(0);
  const [eventNameFilter, setEventNameFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<DeliveryOverallStatusFilter>('all');
  const limit = 20;

  const query = useQuery({
    queryKey: ['admin-events', limit, offset, eventNameFilter, sourceFilter, deliveryStatusFilter],
    queryFn: () =>
      trackingApi.listRecentEvents({
        limit,
        offset,
        eventName: eventNameFilter,
        source: sourceFilter,
        deliveryStatus: deliveryStatusFilter
      }),
    refetchInterval: 15_000
  });

  const total = query.data?.paging.total ?? 0;
  const pageEnd = Math.min(offset + limit, total);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const rows = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  const statusSummary = useMemo(() => {
    const base = { queued: 0, success: 0, failed: 0 };
    for (const row of rows) {
      base[row.deliveryOverallStatus] += 1;
    }
    return base;
  }, [rows]);

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOffset(0);
  };

  const clearFilters = () => {
    setEventNameFilter('');
    setSourceFilter('');
    setDeliveryStatusFilter('all');
    setOffset(0);
  };

  return (
    <Card
      title="Events"
      subtitle="Latest canonical events from DB with delivery states (queued/success/failed)"
    >
      <form className="filters-row" onSubmit={applyFilters}>
        <label>
          Event name
          <input
            value={eventNameFilter}
            onChange={(event) => setEventNameFilter(event.target.value)}
            placeholder="purchase"
          />
        </label>
        <label>
          Source
          <input
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            placeholder="meta"
          />
        </label>
        <label>
          Delivery status
          <select
            value={deliveryStatusFilter}
            onChange={(event) => {
              setDeliveryStatusFilter(event.target.value as DeliveryOverallStatusFilter);
              setOffset(0);
            }}
          >
            <option value="all">all</option>
            <option value="queued">queued</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
          </select>
        </label>
        <div className="toolbar-actions">
          <button type="submit" className="ghost-btn">Apply</button>
          <button type="button" className="ghost-btn" onClick={clearFilters}>Clear</button>
        </div>
      </form>

      <div className="status-summary-grid">
        <div className="summary-chip queued">queued: {statusSummary.queued}</div>
        <div className="summary-chip success">success: {statusSummary.success}</div>
        <div className="summary-chip failed">failed: {statusSummary.failed}</div>
      </div>

      <div className="toolbar">
        <p className="muted-small">
          Showing {total === 0 ? 0 : offset + 1}-{pageEnd} of {total}
        </p>
        <div className="toolbar-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
            disabled={!canPrev}
          >
            Prev
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setOffset((prev) => prev + limit)}
            disabled={!canNext}
          >
            Next
          </button>
        </div>
      </div>

      {query.isLoading ? <p className="muted-small">Loading events...</p> : null}
      {query.error ? <p className="hint danger">Failed to load events.</p> : null}

      {!query.isLoading && rows.length === 0 ? <p className="muted-small">No events found for current filters.</p> : null}

      {rows.length > 0 ? (
        <div className="events-grid">
          {rows.map((item) => (
            <article key={item.eventId} className="event-row">
              <div className="event-row-head">
                <div>
                  <strong>{item.eventName}</strong>
                  <p className="muted-small">{item.eventId}</p>
                </div>
                <span className={statusClass(item.deliveryOverallStatus)}>{item.deliveryOverallStatus}</span>
              </div>

              <div className="event-meta">
                <span>session: {item.sessionId}</span>
                <span>source: {item.source ?? '-'}</span>
                <span>campaign: {item.campaign ?? '-'}</span>
                <span>
                  value: {item.eventValue ?? '-'} {item.currency ?? ''}
                </span>
                <span>created: {formatDate(item.createdAt)}</span>
              </div>

              <div className="delivery-list">
                {item.deliveries.length === 0 ? (
                  <span className="status-pill queued">queued</span>
                ) : (
                  item.deliveries.map((delivery) => {
                    const normalized = normalizeDeliveryState(delivery.status);
                    return (
                      <span key={`${item.eventId}-${delivery.destination}`} className={statusClass(normalized)}>
                        {delivery.destination}: {normalized}
                      </span>
                    );
                  })
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
