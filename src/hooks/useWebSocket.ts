import { useState, useEffect, useCallback } from 'react';
import type { ProductEvent } from '@/types/events';

export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState<ProductEvent[]>([]);

    const handleNewEvent = useCallback((newEvent: ProductEvent) => {
        setEvents(prevEvents => {
            const eventExists = prevEvents.some(
                e => e.id === newEvent.id && e.sequence === newEvent.sequence
            );

            if (eventExists) {
                return prevEvents;
            }

            const updatedEvents = [newEvent, ...prevEvents]
                .sort((a, b) => b.sequence - a.sequence)
                .slice(0, 100);

            return updatedEvents;
        });
    }, []);

    useEffect(() => {
        let ws: WebSocket;
        let reconnectTimer: ReturnType<typeof setTimeout>;
        const processedEvents = new Map<string, number>();
        let batchTimeout: ReturnType<typeof setTimeout>;
        let pendingEvents: ProductEvent[] = [];

        const processBatch = () => {
            if (pendingEvents.length > 0) {
                pendingEvents.forEach(event => handleNewEvent(event));
                pendingEvents = [];
            }
        };

        const connect = () => {
            try {
                ws = new WebSocket('ws://localhost:8080/ws');

                ws.onopen = () => {
                    console.log('WebSocket connected');
                    setIsConnected(true);
                };

                ws.onclose = () => {
                    console.log('WebSocket disconnected, trying to reconnect...');
                    setIsConnected(false);
                    reconnectTimer = setTimeout(connect, 5000);
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data) as ProductEvent;

                    const existingSequence = processedEvents.get(data.id);
                    if (existingSequence && existingSequence >= data.sequence) {
                        return;
                    }

                    processedEvents.set(data.id, data.sequence);
                    pendingEvents.push(data);

                    if (processedEvents.size > 1000) {
                        const entries = Array.from(processedEvents.entries());
                        const sortedEntries = entries.sort((a, b) => b[1] - a[1]).slice(0, 500);
                        processedEvents.clear();
                        sortedEntries.forEach(([id, seq]) => processedEvents.set(id, seq));
                    }

                    clearTimeout(batchTimeout);
                    batchTimeout = setTimeout(processBatch, 50);
                };

                ws.onerror = (error) => {
                    console.log('WebSocket error:', error);
                };
            } catch (error) {
                console.log('WebSocket connection error:', error);
            }
        };

        connect();

        return () => {
            ws?.close();
            clearTimeout(reconnectTimer);
            clearTimeout(batchTimeout);
        };
    }, [handleNewEvent]);

    return { isConnected, events };
}
