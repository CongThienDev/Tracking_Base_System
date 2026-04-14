import { useMutation } from '@tanstack/react-query';
import { trackingApi } from '../../../shared/api/tracking-api';

type ReplayEventButtonProps = {
  eventId: string;
  destination?: string;
  label: string;
  compact?: boolean;
  onReplayed?: () => void;
};

export function ReplayEventButton({
  eventId,
  destination,
  label,
  compact = false,
  onReplayed
}: ReplayEventButtonProps) {
  const mutation = useMutation({
    mutationFn: () => trackingApi.replayEvent({ eventId, destination }),
    onSuccess: () => {
      onReplayed?.();
    }
  });
  const errorMessage = mutation.error instanceof Error ? mutation.error.message : undefined;

  return (
    <div className={compact ? 'replay-inline' : 'replay-block'}>
      <button type="button" className="ghost-btn replay-btn" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? 'Replaying...' : label}
      </button>
      {mutation.isSuccess ? <span className="hint success">Replay queued.</span> : null}
      {errorMessage ? <span className="hint danger">{errorMessage}</span> : null}
    </div>
  );
}
