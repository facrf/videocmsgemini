import { useEffect, useState, useRef } from 'react';

export interface SSEEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string;
}

export function useEvents(onEvent?: (event: SSEEvent) => void) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      es = new EventSource('/api/events');
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
      };

      es.onerror = () => {
        setConnected(false);
        es?.close();
        // Reconnect after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };

      // Listen for custom events
      const eventTypes = [
        'camera.created',
        'camera.updated',
        'camera.deleted',
        'camera.online',
        'camera.offline',
        'camera.auth_required',
        'discovery.started',
        'discovery.device_found',
        'discovery.progress',
        'discovery.completed',
        'stream.started',
        'stream.stopped',
        'layout.updated',
        'layout.deleted',
      ];

      eventTypes.forEach((type) => {
        es?.addEventListener(type, (e: MessageEvent) => {
          try {
            const data: SSEEvent = JSON.parse(e.data);
            setLastEvent(data);
            if (onEvent) onEvent(data);
          } catch (err) {
            console.error('Failed to parse SSE payload', err);
          }
        });
      });
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) es.close();
    };
  }, []);

  return { connected, lastEvent };
}
