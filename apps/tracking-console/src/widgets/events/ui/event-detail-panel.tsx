import type { AdminEventDetail, AdminEventItem, DeliveryState } from '../../../entities/tracking/model/admin-events';
import { formatJson } from '../../../shared/lib/format';
import { Card } from '../../../shared/ui/card';
import { ReplayEventButton } from '../../../features/replay-event/ui/replay-event-button';

type EventDetailPanelProps = {
  eventId?: string;
  listItem?: AdminEventItem;
  detail?: AdminEventDetail;
  isLoading?: boolean;
  errorMessage?: string;
  onReplayFinished?: () => void;
};

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function normalizeDeliveryStatus(status: DeliveryState['status']): 'queued' | 'success' | 'failed' {
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

function buildDisplayDeliveries(detail?: AdminEventDetail, listItem?: AdminEventItem) {
  if (detail?.deliveryTimeline?.length) {
    return detail.deliveryTimeline.map((entry) => ({
      destination: entry.destination,
      status: entry.status,
      attemptCount: entry.attemptCount,
      updatedAt: entry.updatedAt,
      lastErrorMessage: entry.lastErrorMessage
    }));
  }

  return listItem?.deliveries ?? [];
}

export function EventDetailPanel({
  eventId,
  listItem,
  detail,
  isLoading = false,
  errorMessage,
  onReplayFinished
}: EventDetailPanelProps) {
  const selectedEventId = detail?.eventId ?? listItem?.eventId ?? eventId;
  const deliveries = buildDisplayDeliveries(detail, listItem);
  const payload = detail?.payload;
  const hasFailedDelivery = deliveries.some((delivery) => normalizeDeliveryStatus(delivery.status) === 'failed');
  const hasSelection = Boolean(selectedEventId);

  return (
    <Card
      title="Event Detail"
      subtitle={
        selectedEventId
          ? 'Payload snapshot, delivery timeline, and recovery actions for the selected event.'
          : 'Select an event to inspect payload JSON and delivery history.'
      }
    >
      {!hasSelection ? <p className="muted-small">Pick a row from the table to open the detail side panel.</p> : null}

      {isLoading ? (
        <div className="detail-skeleton">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-block" />
        </div>
      ) : null}

      {errorMessage ? <p className="hint danger">{errorMessage}</p> : null}

      {hasSelection ? (
        <div className="detail-stack">
          <div className="detail-meta-grid">
            <div>
              <span className="detail-label">Event</span>
              <strong>{detail?.eventName ?? listItem?.eventName ?? '-'}</strong>
            </div>
            <div>
              <span className="detail-label">event_id</span>
              <strong>{selectedEventId ?? '-'}</strong>
            </div>
            <div>
              <span className="detail-label">Timestamp</span>
              <strong>{formatDateTime(detail?.eventTimestamp ?? listItem?.eventTimestamp)}</strong>
            </div>
            <div>
              <span className="detail-label">Source</span>
              <strong>{detail?.source ?? listItem?.source ?? '-'}</strong>
            </div>
            <div>
              <span className="detail-label">Campaign</span>
              <strong>{detail?.campaign ?? listItem?.campaign ?? '-'}</strong>
            </div>
            <div>
              <span className="detail-label">Route</span>
              <strong>{detail?.routeStatus ?? listItem?.routeStatus ?? '-'}</strong>
            </div>
          </div>

          <div className="detail-actions">
            <span className={statusClass(detail?.deliveryOverallStatus ?? listItem?.deliveryOverallStatus ?? 'queued')}>
              {detail?.deliveryOverallStatus ?? listItem?.deliveryOverallStatus ?? 'queued'}
            </span>
            {selectedEventId && hasFailedDelivery ? (
              <ReplayEventButton eventId={selectedEventId} label="Replay failed event" onReplayed={onReplayFinished} />
            ) : null}
          </div>

          <section className="detail-section">
            <header className="detail-section-head">
              <h3>Payload JSON</h3>
              <p>Canonical payload from the event detail endpoint.</p>
            </header>
            {payload ? <pre className="detail-pre">{formatJson(payload)}</pre> : <p className="muted-small">Payload data is unavailable until the event detail endpoint returns it.</p>}
          </section>

          <section className="detail-section">
            <header className="detail-section-head">
              <h3>Delivery Timeline</h3>
              <p>Latest state per destination plus recovery actions for failed deliveries.</p>
            </header>

            {deliveries.length === 0 ? <p className="muted-small">No delivery rows are available for this event yet.</p> : null}

            <ol className="timeline-list">
              {deliveries.map((delivery) => {
                const normalized = normalizeDeliveryStatus(delivery.status);

                return (
                  <li key={`${selectedEventId}-${delivery.destination}`} className="timeline-item">
                    <div className="timeline-item-head">
                      <div>
                        <strong>{delivery.destination}</strong>
                        <p className="muted-small">Updated {formatDateTime(delivery.updatedAt)}</p>
                      </div>
                      <span className={statusClass(normalized)}>{normalized}</span>
                    </div>

                    <div className="timeline-item-meta">
                      <span>Attempts: {delivery.attemptCount}</span>
                      {delivery.lastErrorMessage ? <span className="timeline-error">{delivery.lastErrorMessage}</span> : null}
                    </div>

                    {selectedEventId && normalized === 'failed' ? (
                      <ReplayEventButton
                        eventId={selectedEventId}
                        destination={delivery.destination}
                        label={`Replay ${delivery.destination}`}
                        compact
                        onReplayed={onReplayFinished}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      ) : (
        <p className="muted-small">No event selected.</p>
      )}
    </Card>
  );
}
