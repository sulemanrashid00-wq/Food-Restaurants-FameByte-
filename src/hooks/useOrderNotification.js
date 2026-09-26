import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useOrderNotification(onNewOrder) {
  useEffect(() => {
    const channel = supabase
      .channel('kds-live-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          // Play notification chime
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
          
          if (onNewOrder) onNewOrder(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewOrder]);
}