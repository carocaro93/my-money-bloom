import { useState, useCallback, useEffect } from 'react';
import { DateConfig, RecurrenceConfig, Transaction } from '@/types/finance';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value);

const DEFAULT_RECURRENCE: RecurrenceConfig = {
  isRecurring: false,
  startDate: { isMonthOnly: false, date: null, isIndefinite: false },
  endDate: { isMonthOnly: false, date: null, isIndefinite: true },
};

const parseDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeDateConfig = (input: any): DateConfig | undefined => {
  if (input == null) return undefined;

  // Se la colonna è di tipo DATE/TEXT nel DB potremmo ricevere una stringa
  if (typeof input === 'string' || input instanceof Date) {
    return { isMonthOnly: false, date: parseDateValue(input), isIndefinite: false };
  }

  if (typeof input === 'object') {
    return {
      isMonthOnly: !!input.isMonthOnly,
      date: parseDateValue(input.date),
      isIndefinite: input.isIndefinite ?? false,
    };
  }

  return undefined;
};

const serializeDateConfig = (input?: DateConfig | null) => {
  if (!input) return null;
  return {
    isMonthOnly: !!input.isMonthOnly,
    date: input.date ? input.date.toISOString() : null,
    isIndefinite: input.isIndefinite ?? false,
  };
};

const normalizeRecurrence = (input: any): RecurrenceConfig => {
  if (!input || typeof input !== 'object') return DEFAULT_RECURRENCE;
  return {
    isRecurring: !!input.isRecurring,
    startDate: normalizeDateConfig(input.startDate) ?? DEFAULT_RECURRENCE.startDate,
    endDate: normalizeDateConfig(input.endDate) ?? DEFAULT_RECURRENCE.endDate,
  };
};

const serializeRecurrence = (input: RecurrenceConfig) => ({
  isRecurring: !!input.isRecurring,
  startDate: serializeDateConfig(input.startDate),
  endDate: serializeDateConfig(input.endDate),
});

// Helper per convertire da Supabase a Transaction
const fromSupabase = (row: any): Transaction => ({
  id: row.id,
  type: row.type,
  flowType: row.flow_type,
  amount: Number(row.amount),
  description: row.description || '',
  category: row.category || '',
  accountId: row.account_id, // UUID dell'account
  recurrence: normalizeRecurrence(row.recurrence),
  executionDate: normalizeDateConfig(row.execution_date),
  probability: row.probability ?? undefined,
  createdAt: new Date(row.created_at),
});

// Helper per convertire da Transaction a Supabase
const toSupabase = (t: Omit<Transaction, 'id' | 'createdAt'>, userId: string) => ({
  user_id: userId,
  type: t.type,
  flow_type: t.flowType,
  amount: t.amount,
  description: t.description,
  category: t.category,
  account_id: t.accountId,
  recurrence: serializeRecurrence(t.recurrence),
  execution_date: serializeDateConfig(t.executionDate ?? null),
  probability: t.probability ?? null,
});

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carica le transazioni da Supabase
  const loadTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Errore caricamento transazioni:', error);
        toast.error('Errore nel caricamento delle transazioni');
        return;
      }

      const loadedTransactions = (data || []).map(fromSupabase);
      setTransactions(loadedTransactions);
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nel caricamento delle transazioni');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Carica al mount e quando cambia l'utente
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    if (!isUuid(transaction.accountId)) {
      toast.error(`Conto non valido (accountId=${String(transaction.accountId)})`);
      return;
    }

    const payload = toSupabase(transaction, user.id);

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Errore creazione transazione:', {
          error,
          userId: user.id,
          accountId: transaction.accountId,
          payload,
        });
        toast.error(`${error.message}${error.code ? ` (codice: ${error.code})` : ''}`);
        return;
      }

      // Aggiorna lo stato locale solo dopo conferma da Supabase
      const newTransaction = fromSupabase(data);
      setTransactions(prev => [newTransaction, ...prev]);
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nella creazione della transazione');
    }
  }, [user]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    try {
      // Converti gli updates nel formato Supabase
      const supabaseUpdates: any = {};
      if (updates.type !== undefined) supabaseUpdates.type = updates.type;
      if (updates.flowType !== undefined) supabaseUpdates.flow_type = updates.flowType;
      if (updates.amount !== undefined) supabaseUpdates.amount = updates.amount;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.category !== undefined) supabaseUpdates.category = updates.category;
      if (updates.accountId !== undefined) {
        if (!isUuid(updates.accountId)) {
          toast.error('Seleziona un conto valido');
          return;
        }
        supabaseUpdates.account_id = updates.accountId;
      }
      if (updates.recurrence !== undefined) supabaseUpdates.recurrence = serializeRecurrence(updates.recurrence);
      if (updates.executionDate !== undefined) supabaseUpdates.execution_date = serializeDateConfig(updates.executionDate);
      if (updates.probability !== undefined) supabaseUpdates.probability = updates.probability ?? null;

      const { error } = await supabase
        .from('transactions')
        .update(supabaseUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Errore aggiornamento transazione:', {
          error,
          userId: user.id,
          transactionId: id,
          supabaseUpdates,
        });
        toast.error(`${error.message}${error.code ? ` (codice: ${error.code})` : ''}`);
        return;
      }

      // Aggiorna lo stato locale solo dopo conferma da Supabase
      setTransactions(prev =>
        prev.map(t => (t.id === id ? { ...t, ...updates } : t))
      );
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nell\'aggiornamento della transazione');
    }
  }, [user]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Errore eliminazione transazione:', error);
        toast.error('Errore nell\'eliminazione della transazione');
        return;
      }

      // Aggiorna lo stato locale solo dopo conferma da Supabase
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nell\'eliminazione della transazione');
    }
  }, [user]);

  const totalIncome = transactions
    .filter(t => t.flowType === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.flowType === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return {
    transactions,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    totalIncome,
    totalExpense,
    balance,
    refreshTransactions: loadTransactions,
  };
}
