import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, CalendarDays, CreditCard, HandCoins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types/finance';
import { format, isSameMonth, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardProps {
  transactions: Transaction[];
}

function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  
  // Generate 12 months back and 12 months forward
  for (let i = -12; i <= 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    options.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: it }),
    });
  }
  
  return options;
}

function isTransactionInMonth(transaction: Transaction, selectedMonth: Date): boolean {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  
  const { recurrence, executionDate, type } = transaction;
  
  if (recurrence.isRecurring) {
    // Check if the recurring transaction is active in this month
    const startDate = recurrence.startDate.date;
    const endDate = recurrence.endDate.date;
    const isStartIndefinite = recurrence.startDate.isIndefinite;
    const isEndIndefinite = recurrence.endDate.isIndefinite;
    
    // If start is indefinite or start is before/same as selected month
    const startOk = isStartIndefinite || !startDate || 
      isBefore(startOfMonth(startDate), monthEnd) || isSameMonth(startDate, selectedMonth);
    
    // If end is indefinite or end is after/same as selected month
    const endOk = isEndIndefinite || !endDate || 
      isAfter(endOfMonth(endDate), monthStart) || isSameMonth(endDate, selectedMonth);
    
    return startOk && endOk;
  } else {
    // Non-recurring: check the date
    const transactionDate = recurrence.startDate.date;
    
    // For debts/credits, also consider execution date
    if ((type === 'debt' || type === 'credit') && executionDate?.date) {
      return isSameMonth(executionDate.date, selectedMonth);
    }
    
    if (transactionDate) {
      return isSameMonth(transactionDate, selectedMonth);
    }
    
    return false;
  }
}

export function Dashboard({ transactions }: DashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  
  const selectedDate = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }, [selectedMonth]);
  
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => isTransactionInMonth(t, selectedDate));
  }, [transactions, selectedDate]);
  
  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.flowType === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expense = filteredTransactions
      .filter(t => t.flowType === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const debts = filteredTransactions
      .filter(t => t.type === 'debt')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const credits = filteredTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const transactionsOnly = filteredTransactions
      .filter(t => t.type === 'transaction');
    
    const transactionsIncome = transactionsOnly
      .filter(t => t.flowType === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const transactionsExpense = transactionsOnly
      .filter(t => t.flowType === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      income,
      expense,
      balance: income - expense,
      debts,
      credits,
      transactionsIncome,
      transactionsExpense,
      transactionsCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Month Selector - Primary Element */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Seleziona Mese</h2>
        </div>
        
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full text-lg h-14 glass border-primary/20">
            <SelectValue>
              {capitalizeFirst(format(selectedDate, 'MMMM yyyy', { locale: it }))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {monthOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {capitalizeFirst(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Balance Card - Main Highlight */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-medium">
              Saldo {capitalizeFirst(format(selectedDate, 'MMMM yyyy', { locale: it }))}
            </span>
          </div>
          <p className={cn(
            "text-4xl font-bold tracking-tight",
            stats.balance >= 0 ? "text-gradient" : "text-destructive"
          )}>
            {formatCurrency(stats.balance)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {stats.transactionsCount} movimenti nel mese
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Income Card */}
        <div className="glass rounded-2xl p-5 group hover:border-success/30 transition-colors duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Entrate Totali</p>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(stats.income)}
          </p>
        </div>

        {/* Expense Card */}
        <div className="glass rounded-2xl p-5 group hover:border-destructive/30 transition-colors duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Uscite Totali</p>
          <p className="text-2xl font-bold text-destructive">
            {formatCurrency(stats.expense)}
          </p>
        </div>

        {/* Debts Card */}
        <div className="glass rounded-2xl p-5 group hover:border-debt/30 transition-colors duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-debt/10">
              <CreditCard className="w-5 h-5 text-debt" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Debiti</p>
          <p className="text-2xl font-bold text-debt">
            {formatCurrency(stats.debts)}
          </p>
        </div>

        {/* Credits Card */}
        <div className="glass rounded-2xl p-5 group hover:border-credit/30 transition-colors duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-credit/10">
              <HandCoins className="w-5 h-5 text-credit" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Crediti</p>
          <p className="text-2xl font-bold text-credit">
            {formatCurrency(stats.credits)}
          </p>
        </div>
      </div>
    </div>
  );
}
