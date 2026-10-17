import { create } from 'zustand';
import { Reservation } from '@/types';

interface ReservationsState {
  activeReservation: Reservation | null;
  isOpenTicketModal: boolean;
  setActiveReservation: (res: Reservation | null) => void;
  setOpenTicketModal: (isOpen: boolean) => void;
  clearActiveReservation: () => void;
}

const STORAGE_KEY = 'aura_active_reservation';

// Helper para leer de localStorage
const loadInitialReservation = (): Reservation | null => {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    const parsed = JSON.parse(item) as Reservation;

    // Verificar si ya expiró
    if (new Date(parsed.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const useReservations = create<ReservationsState>((set) => ({
  activeReservation: loadInitialReservation(),
  isOpenTicketModal: false,

  setActiveReservation: (res: Reservation | null) => {
    if (typeof window !== 'undefined') {
      if (res) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    set({ activeReservation: res, isOpenTicketModal: !!res });
  },

  setOpenTicketModal: (isOpen: boolean) => set({ isOpenTicketModal: isOpen }),

  clearActiveReservation: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ activeReservation: null, isOpenTicketModal: false });
  },
}));

