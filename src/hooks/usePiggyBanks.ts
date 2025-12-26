import { useState, useCallback, useEffect } from 'react';
import { PiggyBankAccount } from '@/components/PiggyBankManager';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function usePiggyBanks() {
  const { user } = useAuth();
  const [piggyBanks, setPiggyBanks] = useState<PiggyBankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carica gli account da Supabase
  const loadAccounts = useCallback(async () => {
    if (!user) {
      setPiggyBanks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'piggybank');

      if (error) {
        console.error('Errore caricamento account:', error);
        toast.error('Errore nel caricamento dei salvadanai');
        return;
      }

      const accounts: PiggyBankAccount[] = (data || []).map(acc => ({
        id: acc.id,
        label: acc.name,
        type: 'piggybank' as const,
      }));

      setPiggyBanks(accounts);
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nel caricamento dei salvadanai');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Carica al mount e quando cambia l'utente
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const addPiggyBank = useCallback(async (name: string) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: name,
          type: 'piggybank',
          target_amount: 0,
          current_amount: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Errore creazione salvadanaio:', error);
        toast.error('Errore nella creazione del salvadanaio');
        return;
      }

      // Aggiorna lo stato locale solo dopo conferma da Supabase
      const newPiggyBank: PiggyBankAccount = {
        id: data.id,
        label: data.name,
        type: 'piggybank',
      };
      setPiggyBanks(prev => [...prev, newPiggyBank]);
      toast.success('Salvadanaio creato!');
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nella creazione del salvadanaio');
    }
  }, [user]);

  const deletePiggyBank = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Errore eliminazione salvadanaio:', error);
        toast.error('Errore nell\'eliminazione del salvadanaio');
        return;
      }

      // Aggiorna lo stato locale solo dopo conferma da Supabase
      setPiggyBanks(prev => prev.filter(pb => pb.id !== id));
      toast.success('Salvadanaio eliminato!');
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nell\'eliminazione del salvadanaio');
    }
  }, [user]);

  const updatePiggyBank = useCallback(async (id: string, updates: { name?: string; target_amount?: number }) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Errore aggiornamento salvadanaio:', error);
        toast.error('Errore nell\'aggiornamento del salvadanaio');
        return;
      }

      // Aggiorna lo stato locale
      if (updates.name) {
        setPiggyBanks(prev => 
          prev.map(pb => pb.id === id ? { ...pb, label: updates.name! } : pb)
        );
      }
      toast.success('Salvadanaio aggiornato!');
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nell\'aggiornamento del salvadanaio');
    }
  }, [user]);

  return {
    piggyBanks,
    isLoading,
    addPiggyBank,
    deletePiggyBank,
    updatePiggyBank,
    refreshAccounts: loadAccounts,
  };
}
