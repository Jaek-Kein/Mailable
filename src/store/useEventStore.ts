import { create } from "zustand";
import mockEvents from '@/data/MockEvent.json';

interface Event {
    id: string;
    title: string;
    date: string;
    place: string;
    sheetUrl: string;
}

interface EventStore {
    events: Event[];
    addEvent: (event: Event) => void;
    removeEvent: (id: string) => void;
}

export const useEventStore = create<EventStore>((set) => ({
    events: mockEvents,
    addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
    removeEvent: (id) => set((state) => ({ events: state.events.filter((e) => e.id !== id)}))
}))