import { create } from 'zustand';
import { Reservation } from '@/types';

interface ReservationsState {
  activeReservation: Reservation | null;
  activeReservations: Reservation[];
  isOpenTicketModal: boolean;
  setActiveReservation: (res: Reservation | null) => void;
  removeActiveReservation: (idOrPin: string) => void;
  setOpenTicketModal: (isOpen: boolean) => void;
  clearActiveReservation: (idOrPin?: string) => void;
}

const STORAGE_KEY = 'aura_active_reservation';
const MULTI_STORAGE_KEY = 'aura_active_reservations_list';

// Helper para leer lista inicial de localStorage
const loadInitialReservationsList = (): Reservation[] => {
  if (typeof window === 'undefined') return [];
  try {
    const listRaw = localStorage.getItem(MULTI_STORAGE_KEY);
    let list: Reservation[] = listRaw ? JSON.parse(listRaw) : [];

    // Fallback: si hay reserva única en STORAGE_KEY, migrarla a la lista
    const singleRaw = localStorage.getItem(STORAGE_KEY);
    if (singleRaw) {
      const single = JSON.parse(singleRaw) as Reservation;
      const key = single.id || single.pin || single.pin_code;
      if (key && !list.some(r => (r.id || r.pin || r.pin_code) === key)) {
        list.unshift(single);
      }
    }

    // Filtrar expiradas
    const now = Date.now();
    const active = list.filter(r => !r.expires_at || new Date(r.expires_at).getTime() > now);
    localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(active));
    return active;
  } catch {
    return [];
  }
};

const loadInitialReservation = (): Reservation | null => {
  const list = loadInitialReservationsList();
  return list.length > 0 ? list[0] : null;
};

export const useReservations = create<ReservationsState>((set, get) => ({
  activeReservation: loadInitialReservation(),
  activeReservations: loadInitialReservationsList(),
  isOpenTicketModal: false,

  setActiveReservation: (res: Reservation | null) => {
    if (typeof window !== 'undefined') {
      if (res) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res));

        const listRaw = localStorage.getItem(MULTI_STORAGE_KEY);
        let list: Reservation[] = listRaw ? JSON.parse(listRaw) : [];
        const key = res.id || res.pin || res.pin_code;
        const index = list.findIndex(r => (r.id || r.pin || r.pin_code) === key);
        if (index >= 0) {
          list[index] = { ...list[index], ...res };
        } else {
          list.unshift(res);
        }
        localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(list));
        set({ activeReservation: res, activeReservations: list, isOpenTicketModal: !!res });
        return;
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    set({ activeReservation: res, isOpenTicketModal: !!res });
  },

  removeActiveReservation: (idOrPin: string) => {
    if (typeof window !== 'undefined') {
      const listRaw = localStorage.getItem(MULTI_STORAGE_KEY);
      let list: Reservation[] = listRaw ? JSON.parse(listRaw) : [];
      list = list.filter(r => r.id !== idOrPin && r.pin !== idOrPin && r.pin_code !== idOrPin);
      localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(list));

      const nextActive = list.length > 0 ? list[0] : null;
      if (nextActive) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextActive));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      set({ activeReservation: nextActive, activeReservations: list });
      return;
    }
    set((state) => {
      const list = state.activeReservations.filter(r => r.id !== idOrPin && r.pin !== idOrPin && r.pin_code !== idOrPin);
      return { activeReservation: list.length > 0 ? list[0] : null, activeReservations: list };
    });
  },

  setOpenTicketModal: (isOpen: boolean) => set({ isOpenTicketModal: isOpen }),

  clearActiveReservation: (idOrPin?: string) => {
    if (idOrPin) {
      get().removeActiveReservation(idOrPin);
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MULTI_STORAGE_KEY);
    }
    set({ activeReservation: null, activeReservations: [], isOpenTicketModal: false });
  },
}));

