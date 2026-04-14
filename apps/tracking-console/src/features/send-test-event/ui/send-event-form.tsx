import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { trackingApi } from '../../../shared/api/tracking-api';
import { formatJson, generateSessionId } from '../../../shared/lib/format';
import type { TrackPayload, TrackResponse } from '../../../entities/tracking/model/types';
import { Card } from '../../../shared/ui/card';

const inputSchema = z.object({
  eventName: z.string().min(2),
  source: z.string().optional(),
  campaign: z.string().optional(),
  value: z.string().optional()
});

function buildPayload(eventName: string, source?: string, campaign?: string, value?: string): TrackPayload {
  const parsedValue = value?.trim() ? Number(value) : undefined;

  return {
    event_name: eventName,
    session: {
      session_id: generateSessionId(),
      source: source?.trim() || undefined,
      campaign: campaign?.trim() || undefined
    },
    event_data: Number.isFinite(parsedValue) ? { value: parsedValue } : undefined,
    context: {
      page_url: window.location.href
    }
  };
}

export function SendEventForm() {
  const [eventName, setEventName] = useState('purchase');
  const [source, setSource] = useState('meta');
  const [campaign, setCampaign] = useState('spring_sale');
  const [value, setValue] = useState('49.99');
  const [lastPayload, setLastPayload] = useState<TrackPayload | null>(null);

  const mutation = useMutation<TrackResponse, Error, TrackPayload>({
    mutationFn: trackingApi.track
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parseResult = inputSchema.safeParse({ eventName, source, campaign, value });
    if (!parseResult.success) {
      return;
    }

    const payload = buildPayload(eventName, source, campaign, value);
    setLastPayload(payload);
    mutation.mutate(payload);
  };

  return (
    <Card title="Event Debugger" subtitle="Send test events directly to POST /track and inspect server response">
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Event name
          <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="purchase" required />
        </label>
        <label>
          Source
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="meta" />
        </label>
        <label>
          Campaign
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="spring_sale" />
        </label>
        <label>
          Value
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="49.99" />
        </label>
        <button type="submit" className="primary-btn" disabled={mutation.isPending}>
          {mutation.isPending ? 'Sending...' : 'Send Test Event'}
        </button>
      </form>

      {lastPayload ? (
        <div className="code-block-wrap">
          <h3>Payload</h3>
          <pre>{formatJson(lastPayload)}</pre>
        </div>
      ) : null}

      {mutation.data ? (
        <div className="code-block-wrap">
          <h3>Response</h3>
          <pre>{formatJson(mutation.data)}</pre>
        </div>
      ) : null}

      {mutation.error ? <p className="hint danger">{mutation.error.message}</p> : null}
    </Card>
  );
}
