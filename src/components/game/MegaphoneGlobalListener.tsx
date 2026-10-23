'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useMegaphoneStore } from '@/store/useMegaphoneStore';
import { fetchQuotesForRequest } from '@/lib/megaphone';
import { useGameSound } from '@/hooks/useGameSound';

export default function MegaphoneGlobalListener() {
  const { playAlertChime } = useGameSound();
  const {
    activeRequest,
    isPanelOpen,
    setQuotes,
    setHasUnreadQuotes,
    clearActiveMegaphone,
    step,
  } = useMegaphoneStore();

  const prevQuotesCountRef = useRef(0);

  useEffect(() => {
    if (!activeRequest?.id || step === 'WINNER_REVEALED') return;

    let isSubscribed = true;

    // 1. Función de sincronización
    const syncQuotes = async () => {
      try {
        const quotes = await fetchQuotesForRequest(activeRequest.id);
        if (!isSubscribed) return;

        // Comprobar si el request expiró
        if (activeRequest.expires_at && new Date(activeRequest.expires_at).getTime() < Date.now()) {
          clearActiveMegaphone();
          return;
        }

        // Si llegaron nuevas cotizaciones
        if (quotes.length > prevQuotesCountRef.current) {
          if (!isPanelOpen) {
            setHasUnreadQuotes(true);
            playAlertChime();
          }
        }

        prevQuotesCountRef.current = quotes.length;
        setQuotes(quotes);
      } catch (err) {
        console.warn('Error sincronizando cotizaciones de megáfono:', err);
      }
    };

    // Sincronización inicial
    syncQuotes();

    // 2. Sondeo de respaldo cada 2.5 segundos
    const pollInterval = setInterval(syncQuotes, 2500);

    // 3. Suscripción Realtime en Supabase a megaphone_quotes
    const channel = supabase
      .channel(`megaphone_client_quotes_${activeRequest.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'megaphone_quotes',
          filter: `request_id=eq.${activeRequest.id}`,
        },
        () => {
          syncQuotes();
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [
    activeRequest?.id,
    activeRequest?.expires_at,
    step,
    isPanelOpen,
    setQuotes,
    setHasUnreadQuotes,
    playAlertChime,
    clearActiveMegaphone,
  ]);

  return null;
}
