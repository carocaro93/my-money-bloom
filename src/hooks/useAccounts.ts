import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'main' | 'card' | 'piggybank';
  balance: number;
  created_at: string;
}

export function useAccounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch accounts from Supabase
  const fetchAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Errore caricamento",
        description: error.message || "Impossibile caricare gli account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = useCallback(async (name: string, type: Account['type'] = 'piggybank') => {
    if (!user) {
      toast({
        title: "Errore",
        description: "Devi essere loggato per creare un account.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const newAccount = {
        user_id: user.id,
        name,
        type,
        balance: 0,
      };

      const { data, error } = await supabase
        .from('accounts')
        .insert(newAccount)
        .select()
        .single();

      if (error) throw error;

      setAccounts(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      console.error('Error adding account:', error);
      toast({
        title: "Errore creazione",
        description: error.message || "Impossibile creare l'account.",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Pick<Account, 'name' | 'balance'>>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setAccounts(prev => prev.map(acc => 
        acc.id === id ? { ...acc, ...updates } : acc
      ));
      return true;
    } catch (error: any) {
      console.error('Error updating account:', error);
      toast({
        title: "Errore aggiornamento",
        description: error.message || "Impossibile aggiornare l'account.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  const deleteAccount = useCallback(async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setAccounts(prev => prev.filter(acc => acc.id !== id));
      return true;
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Errore eliminazione",
        description: error.message || "Impossibile eliminare l'account.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  // Get piggy banks only
  const piggyBanks = accounts.filter(acc => acc.type === 'piggybank');

  // Get all accounts formatted for UI
  const allAccounts = accounts.map(acc => ({
    id: acc.id,
    label: acc.name,
    type: acc.type,
  }));

  return {
    accounts,
    allAccounts,
    piggyBanks,
    loading,
    addAccount,
    updateAccount,
    deleteAccount,
    refetch: fetchAccounts,
  };
}
