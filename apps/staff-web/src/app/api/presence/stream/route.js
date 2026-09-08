import { jsonError, requirePermission } from '@ephemeris/auth';
import { query } from '@ephemeris/db';
import { presenceStatus } from '@ephemeris/db/presence';

export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

async function loadPresence() {
  const { rows } = await query(
    `SELECT u.id, u.role, u.resort_id, u.last_seen_at, u.last_active_at
     FROM users u
     WHERE u.role IN ('internal', 'external') AND u.status = 'active'
     ORDER BY u.id`
  );
  const now = Date.now();
  return rows.map((user) => ({
    id: user.id,
    role: user.role,
    resort_id: user.resort_id,
    last_seen_at: user.last_seen_at,
    presence: presenceStatus({
      lastSeenAt: user.last_seen_at,
      lastActiveAt: user.last_active_at,
    }, now),
  }));
}

export async function GET(request) {
  try {
    await requirePermission('admin.users', ['admin']);
  } catch (error) {
    return jsonError(error);
  }

  let interval;
  let closed = false;
  let sending = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (closed || sending) return;
        sending = true;
        try {
          const users = await loadPresence();
          controller.enqueue(encoder.encode(`event: presence\ndata: ${JSON.stringify({ users })}\n\n`));
        } catch (error) {
          closed = true;
          if (interval) clearInterval(interval);
          controller.error(error);
        } finally {
          sending = false;
        }
      };

      request.signal.addEventListener('abort', () => {
        closed = true;
        if (interval) clearInterval(interval);
      }, { once: true });

      await send();
      if (!closed) interval = setInterval(send, 10_000);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}
