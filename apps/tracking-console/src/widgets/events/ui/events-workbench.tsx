import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminEventItem, AdminEventsQueryInput, EventSortField, SortDirection } from '../../../entities/tracking/model/admin-events';
import { trackingApi } from '../../../shared/api/tracking-api';
import { Card } from '../../../shared/ui/card';
import { EventDetailPanel } from './event-detail-panel';

type FilterState = {
  eventId: string;
  eventName: string;
  source: string;
  destination: string;
  deliveryStatus: 'all' | 'queued' | 'success' | 'failed';
  from: string;
  to: string;
  sortBy: EventSortField;
  sortDirection: SortDirection;
};

const emptyFilters: FilterState = {
  eventId: '',
  eventName: '',
  source: '',
  destination: '',
  deliveryStatus: 'all',
  from: '',
  to: '',
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function parseDateFilter(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function sortStatusRank(status: AdminEventItem['deliveryOverallStatus']): number {
  if (status === 'failed') {
    return 2;
  }

  if (status === 'success') {
    return 1;
  }

  return 0;
}

function compareValues(
  left: AdminEventItem,
  right: AdminEventItem,
  sortBy: EventSortField,
  direction: SortDirection
): number {
  const multiplier = direction === 'asc' ? 1 : -1;

  let result = 0;
  switch (sortBy) {
    case 'eventName':
      result = left.eventName.localeCompare(right.eventName);
      break;
    case 'source':
      result = (left.source ?? '').localeCompare(right.source ?? '');
      break;
    case 'eventTimestamp':
      result = new Date(left.eventTimestamp).getTime() - new Date(right.eventTimestamp).getTime();
      break;
    case 'deliveryOverallStatus':
      result = sortStatusRank(left.deliveryOverallStatus) - sortStatusRank(right.deliveryOverallStatus);
      break;
    case 'createdAt':
    default:
      result = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      break;
  }

  return result * multiplier;
}

function matchesText(value: string | null | undefined, filter: string): boolean {
  if (!filter.trim()) {
    return true;
  }

  return (value ?? '').toLowerCase().includes(filter.trim().toLowerCase());
}

function buildQueryInput(filters: FilterState, limit: number, offset: number): AdminEventsQueryInput {
  const from = parseDateFilter(filters.from);
  const to = parseDateFilter(filters.to);

  return {
    limit,
    offset,
    eventId: filters.eventId.trim() || undefined,
    eventName: filters.eventName.trim() || undefined,
    source: filters.source.trim() || undefined,
    destination: filters.destination.trim() || undefined,
    deliveryStatus: filters.deliveryStatus,
    from: from !== null ? new Date(filters.from).toISOString() : undefined,
    to: to !== null ? new Date(filters.to).toISOString() : undefined,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection
  };
}

export function EventsWorkbench() {
  const navigate = useNavigate();
  const params = useParams<{ eventId?: string }>();
  const queryClient = useQueryClient();
  const [draftFilters, setDraftFilters] = useState<FilterState>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(emptyFilters);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const selectedEventId = params.eventId;

  const eventsQuery = useQuery({
    queryKey: ['admin-events', limit, offset, appliedFilters],
    queryFn: () => trackingApi.listRecentEvents(buildQueryInput(appliedFilters, limit, offset)),
    refetchInterval: 15_000
  });

  const rows = eventsQuery.data?.items ?? [];
  const total = eventsQuery.data?.paging.total ?? 0;

  const visibleRows = useMemo(() => {
    return [...rows]
      .filter((item) => matchesText(item.eventId, appliedFilters.eventId))
      .filter((item) => matchesText(item.eventName, appliedFilters.eventName))
      .filter((item) => matchesText(item.source, appliedFilters.source))
      .filter((item) =>
        appliedFilters.deliveryStatus === 'all' ? true : item.deliveryOverallStatus === appliedFilters.deliveryStatus
      )
      .filter((item) => {
        const itemTimestamp = new Date(item.eventTimestamp).getTime();
        const from = parseDateFilter(appliedFilters.from);
        const to = parseDateFilter(appliedFilters.to);

        if (from !== null && itemTimestamp < from) {
          return false;
        }

        if (to !== null && itemTimestamp > to) {
          return false;
        }

        return true;
      })
      .filter((item) => {
        if (!appliedFilters.destination.trim()) {
          return true;
        }

        return item.deliveries.some((delivery) => delivery.destination.toLowerCase().includes(appliedFilters.destination.trim().toLowerCase()));
      })
      .sort((left, right) => compareValues(left, right, appliedFilters.sortBy, appliedFilters.sortDirection));
  }, [rows, appliedFilters]);

  const selectedRow = useMemo(
    () => visibleRows.find((item) => item.eventId === selectedEventId) ?? rows.find((item) => item.eventId === selectedEventId),
    [rows, selectedEventId, visibleRows]
  );

  const detailQuery = useQuery({
    queryKey: ['admin-event-detail', selectedEventId],
    queryFn: () => trackingApi.getEventDetail(selectedEventId ?? ''),
    enabled: Boolean(selectedEventId),
    refetchInterval: selectedEventId ? 5_000 : false
  });

  const detail = detailQuery.data?.item;

  const pageEnd = Math.min(offset + limit, total);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters(draftFilters);
    setOffset(0);
  };

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setOffset(0);
    navigate('/events');
  };

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-events'] });
    if (selectedEventId) {
      void queryClient.invalidateQueries({ queryKey: ['admin-event-detail', selectedEventId] });
    }
  };

  const eventsErrorMessage = eventsQuery.error instanceof Error ? eventsQuery.error.message : undefined;

  return (
    <div className="events-workbench">
      <Card
        title="Events"
        subtitle="Advanced filters, server-backed paging, and server-side replay for operator workflows."
      >
        <form className="events-filter-form" onSubmit={applyFilters}>
          <div className="events-filter-grid">
            <label>
              event_id
              <input
                value={draftFilters.eventId}
                onChange={(event) => setDraftFilters((current) => ({ ...current, eventId: event.target.value }))}
                placeholder="evt_123"
              />
            </label>
            <label>
              Event name
              <input
                value={draftFilters.eventName}
                onChange={(event) => setDraftFilters((current) => ({ ...current, eventName: event.target.value }))}
                placeholder="purchase"
              />
            </label>
            <label>
              Source
              <input
                value={draftFilters.source}
                onChange={(event) => setDraftFilters((current) => ({ ...current, source: event.target.value }))}
                placeholder="meta"
              />
            </label>
            <label>
              Destination
              <input
                value={draftFilters.destination}
                onChange={(event) => setDraftFilters((current) => ({ ...current, destination: event.target.value }))}
                placeholder="google"
              />
            </label>
            <label>
              Status
              <select
                value={draftFilters.deliveryStatus}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    deliveryStatus: event.target.value as FilterState['deliveryStatus']
                  }))
                }
              >
                <option value="all">all</option>
                <option value="queued">queued</option>
                <option value="success">success</option>
                <option value="failed">failed</option>
              </select>
            </label>
            <label>
              From
              <input
                type="datetime-local"
                value={draftFilters.from}
                onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))}
              />
            </label>
            <label>
              To
              <input
                type="datetime-local"
                value={draftFilters.to}
                onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))}
              />
            </label>
            <label>
              Sort by
              <select
                value={draftFilters.sortBy}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    sortBy: event.target.value as EventSortField
                  }))
                }
              >
                <option value="createdAt">created time</option>
                <option value="eventTimestamp">event time</option>
                <option value="eventName">event name</option>
                <option value="source">source</option>
                <option value="deliveryOverallStatus">delivery status</option>
              </select>
            </label>
            <label>
              Direction
              <select
                value={draftFilters.sortDirection}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    sortDirection: event.target.value as SortDirection
                  }))
                }
              >
                <option value="desc">descending</option>
                <option value="asc">ascending</option>
              </select>
            </label>
          </div>

          <div className="toolbar event-toolbar">
            <p className="muted-small">
              {eventsQuery.isFetching ? 'Refreshing event list...' : `Showing ${visibleRows.length} events on this page`}
            </p>
            <div className="toolbar-actions">
              <button type="submit" className="ghost-btn">
                Apply
              </button>
              <button type="button" className="ghost-btn" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>
        </form>

        {eventsErrorMessage ? <p className="hint danger">Failed to load events: {eventsErrorMessage}</p> : null}

        {eventsQuery.isLoading ? (
          <div className="table-skeleton">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        ) : null}

        {!eventsQuery.isLoading && visibleRows.length === 0 ? (
          <p className="muted-small">No events match the current filters.</p>
        ) : null}

        {visibleRows.length > 0 ? (
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Timestamp</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Session</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((item) => {
                  const isSelected = item.eventId === selectedEventId;
                  const destinationSummary = item.deliveries.length > 0 ? item.deliveries.map((delivery) => delivery.destination).join(', ') : '-';

                  return (
                    <tr key={item.eventId} className={isSelected ? 'is-selected' : undefined}>
                      <td>
                        <Link to={`/events/${item.eventId}`} className="event-link">
                          <strong>{item.eventName}</strong>
                          <span>{item.eventId}</span>
                        </Link>
                      </td>
                      <td>{formatDateTime(item.eventTimestamp)}</td>
                      <td>{item.source ?? '-'}</td>
                      <td>{destinationSummary}</td>
                      <td>
                        <span className={`status-pill ${item.deliveryOverallStatus}`}>{item.deliveryOverallStatus}</span>
                      </td>
                      <td>{item.sessionId}</td>
                      <td>{formatDateTime(item.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="toolbar">
          <p className="muted-small">
            Showing {total === 0 ? 0 : offset + 1}-{pageEnd} of {total}
          </p>
          <div className="toolbar-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setOffset((current) => Math.max(0, current - limit))}
              disabled={!canPrev}
            >
              Prev
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setOffset((current) => current + limit)}
              disabled={!canNext}
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      <EventDetailPanel
        eventId={selectedEventId}
        listItem={selectedRow}
        detail={detail}
        isLoading={detailQuery.isFetching && Boolean(selectedEventId)}
        errorMessage={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
        onReplayFinished={refreshAll}
      />
    </div>
  );
}
