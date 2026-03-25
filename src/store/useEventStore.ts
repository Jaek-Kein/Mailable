import { create } from "zustand";

interface EventData {
    payload: { rows: Record<string, string>[] };
    version: number;
}

interface Event {
    id: string;
    title: string;
    date: string;
    place: string;
    sheetUrl: string;
    posterUrl?: string | null;
    status?: 'ONGOING' | 'CLOSED';
    ownerId?: string;
    data?: EventData;
}

interface EventStore {
    events: Event[];
    loading: boolean;
    error?: string;
    fetchEvents: () => Promise<void>;
    addEvent: (event: Omit<Event, 'id'>) => Promise<void>;
    removeEvent: (id: string) => Promise<void>;
}

export const useEventStore = create<EventStore>((set) => ({
    events: [],
    loading: false,
    error: undefined,
    
    fetchEvents: async () => {
        set({ loading: true, error: undefined });
        try {
            const response = await fetch('/api/events');
            if (!response.ok) throw new Error(`행사 목록을 불러오지 못했습니다. (${response.status})`);
            const data = await response.json();
            set({ events: data.events ?? [], loading: false });
        } catch (error) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
            set({ loading: false, error: message });
        }
    },
    
    addEvent: async (event) => {
        set({ loading: true, error: undefined });
        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });
            if (!response.ok) throw new Error('Failed to create event');
            const data = await response.json();
            set(state => ({ 
                events: [...state.events, data.data], 
                loading: false 
            }));
        } catch (error) {
            console.error('Error creating event:', error);
            set({ loading: false, error: 'Failed to create event' });
        }
    },
    
    removeEvent: async (id) => {
        set({ loading: true, error: undefined });
        try {
            const response = await fetch(`/api/events/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete event');
            set(state => ({ 
                events: state.events.filter(e => e.id !== id), 
                loading: false 
            }));
        } catch (error) {
            console.error('Error deleting event:', error);
            set({ loading: false, error: 'Failed to delete event' });
        }
    }
}));