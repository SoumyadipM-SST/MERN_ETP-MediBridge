import { useNow } from "../../hooks/useNow.js";

export function videoRemaining(appointment, now, receivedAt) {
  if (appointment.video?.endedAt) return 0;
  if (!appointment.video?.deadlineAt || !appointment.serverNow) return null;
  const elapsed = Math.max(0, now - receivedAt);
  return Math.max(
    0,
    Math.ceil(
      (+new Date(appointment.video.deadlineAt) -
        +new Date(appointment.serverNow) -
        elapsed) /
        1000,
    ),
  );
}
export function VideoCountdown({ appointment, receivedAt }) {
  const now = useNow(1000);
  const remaining = videoRemaining(appointment, now, receivedAt);
  if (remaining === 0) {
    return (
      <div className="notice">
        <p role="status">This consultation has ended.</p>
      </div>
    );
  }
  return null;
}
