import { useState, useCallback } from 'react';
import { Transaction } from '@/types/finance';

const initialTransactions: Transaction[] = [
  {
    id: '1',
    type: 'transaction',
    flowType: 'expense',
    amount: 150,
    description: 'Bolletta luce',
    category: 'utilities',
    account: 'main',
    recurrence: {
      isRecurring: true,
      startDate: { isMonthOnly: true, date: new Date(2024, 0, 1), isIndefinite: false },
      endDate: { isMonthOnly: true, date: null, isIndefinite: true },
    },
    createdAt: new Date(),
  },
  {
    id: '2',
    type: 'transaction',
    flowType: 'income',
    amount: 2500,
    description: 'Stipendio',
    category: 'savings',
    account: 'main',
    recurrence: {
      isRecurring: true,
      startDate: { isMonthOnly: true, date: new Date(2024, 0, 1), isIndefinite: false },
      endDate: { isMonthOnly: true, date: null, isIndefinite: true },
    },
    createdAt: new Date(),
  },
  {
    id: '3',
    type: 'debt',
    flowType: 'expense',
    amount: 200,
    description: 'Prestito a Marco',
    category: 'gifts',
    account: 'main',
    recurrence: {
      isRecurring: false,
      startDate: { isMonthOnly: false, date: new Date(), isIndefinite: false },
      endDate: { isMonthOnly: false, date: null, isIndefinite: true },
    },
    executionDate: { isMonthOnly: false, date: new Date(2024, 5, 15), isIndefinite: false },
    createdAt: new Date(),
  },
  {
    id: '4',
    type: 'credit',
    flowType: 'income',
    amount: 50,
    description: 'Rimborso cena',
    category: 'dining',
    account: 'main',
    recurrence: {
      isRecurring: false,
      startDate: { isMonthOnly: false, date: new Date(), isIndefinite: false },
      endDate: { isMonthOnly: false, date: null, isIndefinite: true },
    },
    createdAt: new Date(),
  },
];

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const totalIncome = transactions
    .filter(t => t.flowType === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.flowType === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    totalIncome,
    totalExpense,
    balance,
  };
}
