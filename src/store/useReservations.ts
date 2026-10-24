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
export const COMPLETED_STORAGE_KEY = 'aura_completed_tickets';

// Comparador estricto para evitar duplicación por ID temporal vs UUID o PIN
export const isSameReservation = (a: Partial<Reservation>, b: Partial<Reservation>) => {
  if (a.id && b.id && a.id === b.id) return true;
  const pinA = a.pin_code || a.pin;
  const pinB = b.pin_code || b.pin;
  if (pinA && pinB && String(pinA).trim() === String(pinB).trim()) return true;
  return false;
};

// Helper para leer y autolimpiar el historial de compras concretadas sin duplicados
export const getCleanCompletedTickets = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) return [];
    const list: any[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    const seen = new Set<string>();
    const clean: any[] = [];

    for (const item of list) {
      const pin = String(item.pin_code || item.pin || item.id || '').trim();
      if (!pin || seen.has(pin)) continue;
      seen.add(pin);
      clean.push({
        ...item,
        pin: item.pin_code || item.pin || pin,
        pin_code: item.pin_code || item.pin || pin,
      });
    }

    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(clean.slice(0, 25)));
    return clean;
  } catch {
    return [];
  }
};

// Helper centralizado para registrar una compra completada asegurando unicidad absoluta
export const recordCompletedPurchase = (res: any) => {
  if (typeof window === 'undefined' || !res) return;
  try {
    const list = getCleanCompletedTickets();
    const targetPin = String(res.pin_code || res.pin || res.id || '').trim();
    if (!targetPin) return;

    // Remover cualquier versión previa del mismo ticket
    const filtered = list.filter((item: any) => {
      const p = String(item.pin_code || item.pin || item.id || '').trim();
      if (p === targetPin) return false;
      if (res.id && item.id && item.id === res.id) return false;
      return true;
    });

    filtered.unshift({
      ...res,
      pin: targetPin,
      pin_code: targetPin,
      status: 'COMPLETED_IN_STORE',
      completed_at: res.completed_at || new Date().toISOString(),
    });

    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(filtered.slice(0, 25)));
  } catch {}
};

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
      if (!list.some(r => isSameReservation(r, single))) {
        list.unshift(single);
      }
    }

    // Filtrar expiradas y deduplicar estrictamente por PIN o ID
    const now = Date.now();
    const seen = new Set<string>();
    const active: Reservation[] = [];

    for (const r of list) {
      if (r.expires_at && new Date(r.expires_at).getTime() <= now) continue;
      const key = r.pin_code || r.pin || r.id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      active.push(r);
    }

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
        const index = list.findIndex(r => isSameReservation(r, res));
        if (index >= 0) {
          list[index] = { ...list[index], ...res };
        } else {
          list.unshift(res);
        }

        // Deduplicación estricta en caliente
        const seen = new Set<string>();
        list = list.filter(r => {
          const key = r.pin_code || r.pin || r.id;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

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

