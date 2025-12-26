import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/types/finance';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch transactions from Supabase
  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data from Supabase format to app format
      const transformedData: Transaction[] = (data || []).map(row => ({
        id: row.id,
        type: row.type,
        flowType: row.flow_type,
        amount: row.amount,
        description: row.description,
        category: row.category,
        account: row.account,
        recurrence: row.recurrence || {
          isRecurring: false,
          startDate: { isMonthOnly: false, date: null, isIndefinite: false },
          endDate: { isMonthOnly: false, date: null, isIndefinite: true },
        },
        executionDate: row.execution_date,
        probability: row.probability,
        createdAt: new Date(row.created_at),
      }));

      setTransactions(transformedData);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Errore caricamento",
        description: error.message || "Impossibile caricare le transazioni.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!user) {
      toast({
        title: "Errore",
        description: "Devi essere loggato per aggiungere transazioni.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const newTransaction = {
        user_id: user.id,
        type: transaction.type,
        flow_type: transaction.flowType,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        account: transaction.account,
        recurrence: transaction.recurrence,
        execution_date: transaction.executionDate,
        probability: transaction.probability,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(newTransaction)
        .select()
        .single();

      if (error) throw error;

      const transformedData: Transaction = {
        id: data.id,
        type: data.type,
        flowType: data.flow_type,
        amount: data.amount,
        description: data.description,
        category: data.category,
        account: data.account,
        recurrence: data.recurrence || {
          isRecurring: false,
          startDate: { isMonthOnly: false, date: null, isIndefinite: false },
          endDate: { isMonthOnly: false, date: null, isIndefinite: true },
        },
        executionDate: data.execution_date,
        probability: data.probability,
        createdAt: new Date(data.created_at),
      };

      setTransactions(prev => [transformedData, ...prev]);
      return transformedData;
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Errore creazione",
        description: error.message || "Impossibile creare la transazione.",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!user) return false;

    try {
      const supabaseUpdates: any = {};
      if (updates.type !== undefined) supabaseUpdates.type = updates.type;
      if (updates.flowType !== undefined) supabaseUpdates.flow_type = updates.flowType;
      if (updates.amount !== undefined) supabaseUpdates.amount = updates.amount;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.category !== undefined) supabaseUpdates.category = updates.category;
      if (updates.account !== undefined) supabaseUpdates.account = updates.account;
      if (updates.recurrence !== undefined) supabaseUpdates.recurrence = updates.recurrence;
      if (updates.executionDate !== undefined) supabaseUpdates.execution_date = updates.executionDate;
      if (updates.probability !== undefined) supabaseUpdates.probability = updates.probability;

      const { error } = await supabase
        .from('transactions')
        .update(supabaseUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTransactions(prev =>
        prev.map(t => (t.id === id ? { ...t, ...updates } : t))
      );
      return true;
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Errore aggiornamento",
        description: error.message || "Impossibile aggiornare la transazione.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Errore eliminazione",
        description: error.message || "Impossibile eliminare la transazione.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  const totalIncome = transactions
    .filter(t => t.flowType === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.flowType === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    totalIncome,
    totalExpense,
    balance,
    refetch: fetchTransactions,
  };
}
