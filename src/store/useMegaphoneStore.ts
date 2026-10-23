import { create } from 'zustand';
import { MegaphoneRequest, MegaphoneQuote, Store } from '@/types';

interface MegaphoneState {
  activeRequest: MegaphoneRequest | null;
  quotes: MegaphoneQuote[];
  isPanelOpen: boolean;
  step: 'EMIT' | 'SCANNING' | 'WINNER_REVEALED';
  hasUnreadQuotes: boolean;
  winnerStore: Partial<Store> | null;
  winnerReservation: any | null;
  initialQuery: string;
  initialCategory: string;

  // Actions
  setActiveRequest: (req: MegaphoneRequest | null) => void;
  setQuotes: (quotes: MegaphoneQuote[]) => void;
  setIsPanelOpen: (isOpen: boolean) => void;
  setStep: (step: 'EMIT' | 'SCANNING' | 'WINNER_REVEALED') => void;
  setWinner: (store: Partial<Store>, reservation: any) => void;
  setHasUnreadQuotes: (hasUnread: boolean) => void;
  openMegaphoneWithQuery: (query?: string, category?: string) => void;
  clearActiveMegaphone: () => void;
}

const STORAGE_REQUEST_KEY = 'aura_active_megaphone_request';
const STORAGE_WINNER_KEY = 'aura_active_megaphone_winner';

// Helper para restaurar solicitud activa de localStorage
const loadInitialRequest = (): MegaphoneRequest | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_REQUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MegaphoneRequest;

    // Verificar si expiró (30 min)
    if (!parsed.expires_at || new Date(parsed.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(STORAGE_REQUEST_KEY);
      localStorage.removeItem(STORAGE_WINNER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

// Helper para restaurar ganador activo de localStorage
const loadInitialWinner = (): { store: Partial<Store>; reservation: any } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_WINNER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (parsed.reservation?.expires_at && new Date(parsed.reservation.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(STORAGE_WINNER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const initialReq = loadInitialRequest();
const initialWinner = loadInitialWinner();

export const useMegaphoneStore = create<MegaphoneState>((set) => ({
  activeRequest: initialReq,
  quotes: [],
  isPanelOpen: false,
  step: initialWinner ? 'WINNER_REVEALED' : initialReq ? 'SCANNING' : 'EMIT',
  hasUnreadQuotes: false,
  winnerStore: initialWinner?.store || null,
  winnerReservation: initialWinner?.reservation || null,
  initialQuery: initialReq?.query_text || '',
  initialCategory: initialReq?.category_id || 'moda',

  setActiveRequest: (req: MegaphoneRequest | null) => {
    if (typeof window !== 'undefined') {
      if (req) {
        localStorage.setItem(STORAGE_REQUEST_KEY, JSON.stringify(req));
      } else {
        localStorage.removeItem(STORAGE_REQUEST_KEY);
        localStorage.removeItem(STORAGE_WINNER_KEY);
      }
    }
    set({
      activeRequest: req,
      quotes: req ? [] : [],
      step: req ? 'SCANNING' : 'EMIT',
      hasUnreadQuotes: false,
    });
  },

  setQuotes: (quotes: MegaphoneQuote[]) => {
    set((state) => {
      // Si llegan nuevas cotizaciones y el panel está cerrado, marcar no leído
      const isNewArrival = quotes.length > state.quotes.length && !state.isPanelOpen;
      return {
        quotes,
        hasUnreadQuotes: state.hasUnreadQuotes || isNewArrival,
      };
    });
  },

  setIsPanelOpen: (isOpen: boolean) => {
    set((state) => ({
      isPanelOpen: isOpen,
      hasUnreadQuotes: isOpen ? false : state.hasUnreadQuotes,
    }));
  },

  setStep: (step: 'EMIT' | 'SCANNING' | 'WINNER_REVEALED') => set({ step }),

  setWinner: (store: Partial<Store>, reservation: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_WINNER_KEY,
        JSON.stringify({ store, reservation })
      );
    }
    set({
      winnerStore: store,
      winnerReservation: reservation,
      step: 'WINNER_REVEALED',
      isPanelOpen: true,
      hasUnreadQuotes: false,
    });
  },

  setHasUnreadQuotes: (hasUnread: boolean) => set({ hasUnreadQuotes: hasUnread }),

  openMegaphoneWithQuery: (query?: string, category?: string) => {
    set((state) => ({
      isPanelOpen: true,
      initialQuery: query || state.initialQuery,
      initialCategory: category || state.initialCategory,
      hasUnreadQuotes: false,
      step: state.winnerReservation
        ? 'WINNER_REVEALED'
        : state.activeRequest
        ? 'SCANNING'
        : 'EMIT',
    }));
  },

  clearActiveMegaphone: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_REQUEST_KEY);
      localStorage.removeItem(STORAGE_WINNER_KEY);
    }
    set({
      activeRequest: null,
      quotes: [],
      winnerStore: null,
      winnerReservation: null,
      step: 'EMIT',
      hasUnreadQuotes: false,
      isPanelOpen: false,
    });
  },
}));
