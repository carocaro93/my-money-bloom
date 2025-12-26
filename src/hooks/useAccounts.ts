import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { PiggyBankAccount } from '@/components/PiggyBankManager';

export type AccountType = 'main' | 'card' | 'piggybank' | string;

export interface AccountOption {
  id: string;
  label: string;
  type: AccountType;
}

const DEFAULT_ACCOUNTS: Array<{ type: 'main' | 'card'; name: string }> = [
  { type: 'main', name: 'Conto principale' },
  { type: 'card', name: 'Carta di credito' },
];

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Errore caricamento account:', error);
        toast.error(`Errore nel caricamento dei conti: ${error.message}`);
        return;
      }

      const mapped: AccountOption[] = (data || [])
        .map((acc: any) => ({
          id: acc.id,
          label: acc.name ?? '',
          type: acc.type,
        }))
        .filter((a) => Boolean(a.id) && Boolean(a.label));

      setAccounts(mapped);
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nel caricamento dei conti');
    }
  }, [user]);

  const ensureDefaultAccounts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id,type')
        .eq('user_id', user.id);

      if (error) {
        console.error('Errore verifica conti default:', error);
        toast.error(`Impossibile verificare/creare i conti: ${error.message}`);
        return;
      }

      const existingTypes = new Set((data || []).map((r: any) => r.type));
      const toCreate = DEFAULT_ACCOUNTS.filter((a) => !existingTypes.has(a.type)).map((a) => ({
        user_id: user.id,
        name: a.name,
        type: a.type,
        target_amount: 0,
        current_amount: 0,
      }));

      if (toCreate.length === 0) return;

      const { error: insertError } = await supabase.from('accounts').insert(toCreate);
      if (insertError) {
        console.error('Errore creazione conti default:', insertError);
        toast.error(`Impossibile creare i conti default: ${insertError.message}`);
        // Non blocchiamo l'app: l'utente potrà comunque usare i conti esistenti.
      }

    } catch (err) {
      console.error('Errore:', err);
    }
  }, [user]);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    await ensureDefaultAccounts();
    await fetchAccounts();
    setIsLoading(false);
  }, [ensureDefaultAccounts, fetchAccounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const piggyBanks: PiggyBankAccount[] = useMemo(
    () =>
      accounts
        .filter((a) => a.type === 'piggybank')
        .map((a) => ({ id: a.id, label: a.label, type: 'piggybank' as const })),
    [accounts]
  );

  const addPiggyBank = useCallback(
    async (name: string) => {
      if (!user) {
        toast.error('Devi essere autenticato');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('accounts')
          .insert({
            user_id: user.id,
            name,
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

        setAccounts((prev) => [
          ...prev,
          { id: data.id, label: data.name, type: data.type },
        ]);
        toast.success('Salvadanaio creato!');
      } catch (err) {
        console.error('Errore:', err);
        toast.error('Errore nella creazione del salvadanaio');
      }
    },
    [user]
  );

  const deletePiggyBank = useCallback(
    async (id: string) => {
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
          toast.error("Errore nell'eliminazione del salvadanaio");
          return;
        }

        setAccounts((prev) => prev.filter((a) => a.id !== id));
        toast.success('Salvadanaio eliminato!');
      } catch (err) {
        console.error('Errore:', err);
        toast.error("Errore nell'eliminazione del salvadanaio");
      }
    },
    [user]
  );

  return {
    accounts,
    piggyBanks,
    isLoading,
    addPiggyBank,
    deletePiggyBank,
    refreshAccounts: loadAccounts,
  };
}
