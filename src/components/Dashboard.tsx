import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, CalendarDays, RefreshCw, FileText, Pencil, LineChart, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transaction, CATEGORIES, INVESTMENT_CATEGORIES } from '@/types/finance';
import { format, isSameMonth, isAfter, isBefore, startOfMonth, endOfMonth, isPast, differenceInMonths, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface DashboardProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
}

function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  
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
    const startCfg = recurrence.startDate;
    const endCfg = recurrence.endDate;

    // Start: se esiste una data valida, la rispettiamo sempre (anche se "indefinita" è erroneamente true)
    const startOk = startCfg.date
      ? !isAfter(startCfg.isMonthOnly ? startOfMonth(startCfg.date) : startCfg.date, monthEnd)
      : startCfg.isIndefinite
        ? true
        : false;

    // End: se esiste una data valida, la rispettiamo sempre (anche se "indefinita" è erroneamente true)
    const endOk = endCfg.date
      ? !isBefore(endCfg.isMonthOnly ? endOfMonth(endCfg.date) : endCfg.date, monthStart)
      : endCfg.isIndefinite
        ? true
        : false;

    return startOk && endOk;
  }

  const transactionDate = recurrence.startDate.date;

  if ((type === 'debt' || type === 'credit') && executionDate?.date) {
    return isSameMonth(executionDate.date, selectedMonth);
  }

  if (transactionDate) {
    return isSameMonth(transactionDate, selectedMonth);
  }

  return false;
}

export function Dashboard({ transactions, onEdit }: DashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [useProbabilistic, setUseProbabilistic] = useState(false);
  const [showCommitments, setShowCommitments] = useState(true);
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  
  const selectedDate = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }, [selectedMonth]);

  const isPastMonth = useMemo(() => isPast(endOfMonth(selectedDate)), [selectedDate]);
  const isCurrentMonth = useMemo(() => isSameMonth(selectedDate, new Date()), [selectedDate]);
  
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => isTransactionInMonth(t, selectedDate));
  }, [transactions, selectedDate]);

  // Helper to get credit amount (weighted or not)
  const getCreditAmount = (t: Transaction) => {
    if (useProbabilistic && t.type === 'credit') {
      const prob = t.probability || 100;
      return t.amount * prob / 100;
    }
    return t.amount;
  };

  // Recurring expenses for the selected month
  const recurringExpenses = useMemo(() => {
    return filteredTransactions.filter(t => 
      t.recurrence.isRecurring && t.flowType === 'expense'
    );
  }, [filteredTransactions]);

  // Recurring income for the selected month
  const recurringIncome = useMemo(() => {
    return filteredTransactions.filter(t => 
      t.recurrence.isRecurring && t.flowType === 'income'
    );
  }, [filteredTransactions]);

  // Debts filtered by month
  const filteredDebts = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'debt');
  }, [filteredTransactions]);

  // Credits filtered by month
  const filteredCredits = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'credit');
  }, [filteredTransactions]);

  // Investments filtered by month
  const filteredInvestments = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'investment');
  }, [filteredTransactions]);

  // Commitments filtered by month
  const filteredCommitments = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'commitment');
  }, [filteredTransactions]);

  // Counts for total balance sheet display
  const totalCounts = useMemo(() => ({
    credits: transactions.filter(t => t.type === 'credit').length,
    debts: transactions.filter(t => t.type === 'debt').length,
    commitments: transactions.filter(t => t.type === 'commitment').length,
  }), [transactions]);

  // Calcola mesi rimanenti di una ricorrenza dal mese successivo a quello corrente
  const getRemainingMonths = (t: Transaction): number => {
    if (!t.recurrence.isRecurring) return 1;
    
    const now = new Date();
    const nextMonth = startOfMonth(addMonths(now, 1));
    
    const endCfg = t.recurrence.endDate;
    // Se fine indefinita o senza data, consideriamo solo 1 mese (non moltiplicare)
    if (endCfg.isIndefinite || !endCfg.date) return 1;
    
    const endDate = endCfg.isMonthOnly ? endOfMonth(endCfg.date) : endCfg.date;
    
    // Se la ricorrenza è già finita, 0 mesi rimanenti
    if (isBefore(endDate, nextMonth)) return 0;
    
    // Mesi rimanenti = da nextMonth fino a endDate (inclusi)
    const months = differenceInMonths(endOfMonth(endDate), nextMonth) + 1;
    return Math.max(0, months);
  };

  // Total balance sheet (all transactions, not filtered)
  const totalBalanceSheet = useMemo(() => {
    const totalCredits = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + getCreditAmount(t), 0);
    
    const totalDebts = transactions
      .filter(t => t.type === 'debt')
      .reduce((sum, t) => sum + t.amount * getRemainingMonths(t), 0);

    const totalCommitments = showCommitments 
      ? transactions.filter(t => t.type === 'commitment').reduce((sum, t) => sum + t.amount, 0)
      : 0;

    // Liquidi = entrate - uscite (solo transazioni, non debiti/crediti)
    const totalIncome = transactions
      .filter(t => t.type === 'transaction' && t.flowType === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'transaction' && t.flowType === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const liquidi = totalIncome - totalExpense;

    // Patrimonio netto totale = liquidi + crediti - debiti - impegni
    const patrimonioNetto = liquidi + totalCredits - totalDebts - totalCommitments;

    return {
      credits: totalCredits,
      debts: totalDebts,
      commitments: totalCommitments,
      liquidi,
      patrimonioNetto,
    };
  }, [transactions, useProbabilistic, showCommitments]);
  
  // Balance sheet logic (Stato Patrimoniale)
  const balanceSheet = useMemo(() => {
    // ATTIVO (Assets)
    const credits = filteredTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + getCreditAmount(t), 0);
    
    // Entrate NON ricorrenti
    const incomeTransactions = filteredTransactions
      .filter(t => t.type === 'transaction' && t.flowType === 'income' && !t.recurrence.isRecurring)
      .reduce((sum, t) => sum + t.amount, 0);

    // Entrate ricorrenti
    const recurringIncomeTotal = filteredTransactions
      .filter(t => t.recurrence.isRecurring && t.flowType === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalAttivo = credits + incomeTransactions + recurringIncomeTotal;

    // PASSIVO (Liabilities)
    const debts = filteredTransactions
      .filter(t => t.type === 'debt')
      .reduce((sum, t) => sum + t.amount, 0);

    const commitments = showCommitments
      ? filteredTransactions.filter(t => t.type === 'commitment').reduce((sum, t) => sum + t.amount, 0)
      : 0;
    
    // Uscite NON ricorrenti
    const expenseTransactions = filteredTransactions
      .filter(t => t.type === 'transaction' && t.flowType === 'expense' && !t.recurrence.isRecurring)
      .reduce((sum, t) => sum + t.amount, 0);

    // Uscite ricorrenti
    const recurringExpenseTotal = filteredTransactions
      .filter(t => t.recurrence.isRecurring && t.flowType === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPassivo = debts + commitments + expenseTransactions + recurringExpenseTotal;

    // PATRIMONIO NETTO (Net Worth)
    const patrimonioNetto = totalAttivo - totalPassivo;

    return {
      attivo: {
        credits,
        incomeTransactions,
        recurringIncome: recurringIncomeTotal,
        total: totalAttivo,
      },
      passivo: {
        debts,
        commitments,
        expenseTransactions,
        recurringExpense: recurringExpenseTotal,
        total: totalPassivo,
      },
      patrimonioNetto,
    };
  }, [filteredTransactions, useProbabilistic, showCommitments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getCategoryLabel = (categoryId: string, type?: string) => {
    if (type === 'investment') {
      const category = INVESTMENT_CATEGORIES.find(c => c.id === categoryId);
      return category ? `${category.icon} ${category.label}` : categoryId;
    }
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? `${category.icon} ${category.label}` : categoryId;
  };

  const formatDate = (date: Date | null, isMonthOnly: boolean) => {
    if (!date) return 'Data indefinita';
    return isMonthOnly 
      ? format(date, 'MMMM yyyy', { locale: it })
      : format(date, 'dd MMM yyyy', { locale: it });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Toggle Options */}
      <div className="flex flex-wrap items-center justify-end gap-4 px-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="commitments"
            checked={showCommitments}
            onCheckedChange={(checked) => setShowCommitments(checked as boolean)}
          />
          <label htmlFor="commitments" className="text-sm font-medium cursor-pointer">
            Impegni
          </label>
          {showCommitments && (
            <span className="text-xs text-commitment bg-commitment/10 px-2 py-0.5 rounded-full">
              Inclusi
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="probabilistic"
            checked={useProbabilistic}
            onCheckedChange={(checked) => setUseProbabilistic(checked as boolean)}
          />
          <label htmlFor="probabilistic" className="text-sm font-medium cursor-pointer">
            Probabilistica
          </label>
          {useProbabilistic && (
            <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">
              Crediti ponderati
            </span>
          )}
        </div>
      </div>

      {/* Total Balance Sheet - Above month selector */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-medium">Stato Patrimoniale Totale</span>
          </div>
          
          {/* Patrimonio Netto - Hero */}
          <div className={cn(
            "rounded-xl p-4 mb-4 text-center",
            totalBalanceSheet.patrimonioNetto >= 0 
              ? "bg-gradient-to-r from-success/20 via-success/10 to-success/20 border border-success/30" 
              : "bg-gradient-to-r from-destructive/20 via-destructive/10 to-destructive/20 border border-destructive/30"
          )}>
            <p className="text-sm font-medium text-muted-foreground mb-1">Patrimonio Netto</p>
            <p className={cn(
              "text-3xl md:text-4xl font-bold tracking-tight",
              totalBalanceSheet.patrimonioNetto >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(totalBalanceSheet.patrimonioNetto)}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-3 gap-4">
            {showCommitments && (
              <div className="text-center p-3 rounded-lg bg-card/50">
                <p className="text-xs text-muted-foreground mb-1">Impegni</p>
                <p className="text-lg font-bold text-commitment">{formatCurrency(totalBalanceSheet.commitments)}</p>
                <p className="text-xs text-muted-foreground">{totalCounts.commitments} voci</p>
              </div>
            )}
            <div className="text-center p-3 rounded-lg bg-card/50">
              <p className="text-xs text-muted-foreground mb-1">Crediti</p>
              <p className="text-lg font-bold text-success">{formatCurrency(totalBalanceSheet.credits)}</p>
              <p className="text-xs text-muted-foreground">{totalCounts.credits} voci</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card/50">
              <p className="text-xs text-muted-foreground mb-1">Debiti</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(totalBalanceSheet.debts)}</p>
              <p className="text-xs text-muted-foreground">{totalCounts.debts} voci</p>
            </div>
          </div>
          
          {/* Liquidi - Full Width Row */}
          <div className="mt-4 text-center p-4 rounded-lg bg-card/50">
            <p className="text-xs text-muted-foreground mb-1">Liquidi</p>
            <p className={cn(
              "text-xl font-bold",
              totalBalanceSheet.liquidi >= 0 ? "text-primary" : "text-destructive"
            )}>
              {formatCurrency(totalBalanceSheet.liquidi)}
            </p>
          </div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Seleziona Mese</h2>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              isPastMonth ? "bg-muted text-muted-foreground" : 
              isCurrentMonth ? "bg-primary/20 text-primary" : "bg-warning/20 text-warning"
            )}>
              {isPastMonth ? "Consuntivo" : isCurrentMonth ? "Mese Corrente" : "Previsionale"}
            </span>
          </div>
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

      {/* Tabs */}
      <Tabs defaultValue="balance" className="w-full">
        <TabsList className="grid w-full grid-cols-6 h-12 glass">
          <TabsTrigger value="balance" className="gap-1 text-xs sm:text-sm data-[state=active]:bg-primary/20">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Bilancio</span>
          </TabsTrigger>
          <TabsTrigger value="recurring" className="gap-1 text-xs sm:text-sm data-[state=active]:bg-primary/20">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Ricorrenti</span>
          </TabsTrigger>
          <TabsTrigger value="debts" className="gap-1 text-xs sm:text-sm data-[state=active]:bg-destructive/20">
            <TrendingDown className="w-4 h-4" />
            <span className="hidden sm:inline">Debiti</span>
          </TabsTrigger>
          <TabsTrigger value="commitments" className="gap-1 text-xs sm:text-sm data-[state=active]:bg-commitment/20">
            <CalendarCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Impegni</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-1 text-xs sm:text-sm data-[state=active]:bg-success/20">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Crediti</span>
          </TabsTrigger>
          <TabsTrigger value="investments" className="gap-1 text-xs sm:text-sm data-[state=active]:bg-investment/20">
            <LineChart className="w-4 h-4" />
            <span className="hidden sm:inline">Investimenti</span>
          </TabsTrigger>
        </TabsList>

        {/* Balance Sheet Tab */}
        <TabsContent value="balance" className="mt-6 space-y-4">
          {/* Patrimonio Netto - Main Card */}
          <div className="glass rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Patrimonio Netto - {capitalizeFirst(format(selectedDate, 'MMMM yyyy', { locale: it }))}
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full ml-auto",
                  isPastMonth ? "bg-muted/50" : "bg-warning/20 text-warning"
                )}>
                  {isPastMonth ? "Consuntivo" : "Previsionale"}
                </span>
              </div>
              <p className={cn(
                "text-4xl font-bold tracking-tight",
                balanceSheet.patrimonioNetto >= 0 ? "text-gradient" : "text-destructive"
              )}>
                {formatCurrency(balanceSheet.patrimonioNetto)}
              </p>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
          </div>

          {/* Balance Sheet Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* ATTIVO */}
            <div className="glass rounded-2xl p-5 border-l-4 border-success">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-success" />
                <h3 className="font-semibold text-success">ATTIVO</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Crediti</span>
                  <span className="font-medium">{formatCurrency(balanceSheet.attivo.credits)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Entrate</span>
                  <span className="font-medium">{formatCurrency(balanceSheet.attivo.incomeTransactions)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Entrate Ricorrenti</span>
                  <span className="font-medium">{formatCurrency(balanceSheet.attivo.recurringIncome)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">Totale Attivo</span>
                  <span className="font-bold text-success text-lg">{formatCurrency(balanceSheet.attivo.total)}</span>
                </div>
              </div>
            </div>

            {/* PASSIVO */}
            <div className="glass rounded-2xl p-5 border-l-4 border-destructive">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-destructive" />
                <h3 className="font-semibold text-destructive">PASSIVO</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Debiti</span>
                  <span className="font-medium">{formatCurrency(balanceSheet.passivo.debts)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Uscite</span>
                  <span className="font-medium">{formatCurrency(balanceSheet.passivo.expenseTransactions)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Uscite Ricorrenti</span>
                  <span className="font-medium">{formatCurrency(balanceSheet.passivo.recurringExpense)}</span>
                </div>
                {showCommitments && (
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-sm text-commitment">Impegni</span>
                    <span className="font-medium text-commitment">{formatCurrency(balanceSheet.passivo.commitments)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">Totale Passivo</span>
                  <span className="font-bold text-destructive text-lg">{formatCurrency(balanceSheet.passivo.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Recurring Tab */}
        <TabsContent value="recurring" className="mt-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass rounded-2xl p-5 group hover:border-success/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <span className="text-sm font-medium">Entrate Ricorrenti</span>
              </div>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(recurringIncome.reduce((sum, t) => sum + t.amount, 0))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{recurringIncome.length} voci</p>
            </div>

            <div className="glass rounded-2xl p-5 group hover:border-destructive/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
                <span className="text-sm font-medium">Uscite Ricorrenti</span>
              </div>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(recurringExpenses.reduce((sum, t) => sum + t.amount, 0))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{recurringExpenses.length} voci</p>
            </div>
          </div>

          {/* Recurring Expenses List */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-destructive" />
              Dettaglio Uscite Ricorrenti
            </h3>
            
            {recurringExpenses.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Nessuna uscita ricorrente per questo mese
              </p>
            ) : (
              <div className="space-y-3">
                {recurringExpenses.map(expense => (
                  <div 
                    key={expense.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <RefreshCw className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryLabel(expense.category)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Inizio: {formatDate(expense.recurrence.startDate.date, expense.recurrence.startDate.isMonthOnly)} • Fine: {formatDate(expense.recurrence.endDate.date, expense.recurrence.endDate.isMonthOnly)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-destructive">
                        -{formatCurrency(expense.amount)}
                      </span>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(expense)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recurring Income List */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              Dettaglio Entrate Ricorrenti
            </h3>
            
            {recurringIncome.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Nessuna entrata ricorrente per questo mese
              </p>
            ) : (
              <div className="space-y-3">
                {recurringIncome.map(income => (
                  <div 
                    key={income.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <RefreshCw className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">{income.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryLabel(income.category)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Inizio: {formatDate(income.recurrence.startDate.date, income.recurrence.startDate.isMonthOnly)} • Fine: {formatDate(income.recurrence.endDate.date, income.recurrence.endDate.isMonthOnly)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-success">
                        +{formatCurrency(income.amount)}
                      </span>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(income)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Debts Tab */}
        <TabsContent value="debts" className="mt-6 space-y-4">
          {/* Debts Summary */}
          <div className="glass rounded-2xl p-5 border-l-4 border-destructive">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-destructive" />
                <h3 className="font-semibold">Riepilogo Debiti</h3>
              </div>
              <span className="text-2xl font-bold text-destructive">
                {formatCurrency(filteredDebts.reduce((sum, t) => sum + t.amount, 0))}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{filteredDebts.length} debiti nel mese</p>
          </div>

          {/* Debts List */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Elenco Debiti</h3>
            
            {filteredDebts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Nessun debito nel mese selezionato
              </p>
            ) : (
              <div className="space-y-3">
                {filteredDebts.map(debt => (
                  <div 
                    key={debt.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium">{debt.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryLabel(debt.category)} • {debt.executionDate?.isIndefinite ? 'Data indefinita' : formatDate(debt.executionDate?.date || null, debt.executionDate?.isMonthOnly || false)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-destructive">
                        {formatCurrency(debt.amount)}
                      </span>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(debt)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Commitments Tab */}
        <TabsContent value="commitments" className="mt-6 space-y-4">
          {/* Commitments Summary */}
          <div className="glass rounded-2xl p-5 border-l-4 border-commitment">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-commitment" />
                <h3 className="font-semibold">Riepilogo Impegni</h3>
              </div>
              <span className="text-2xl font-bold text-commitment">
                {formatCurrency(filteredCommitments.reduce((sum, t) => sum + t.amount, 0))}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{filteredCommitments.length} impegni nel mese</p>
          </div>

          {/* Commitments List */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Elenco Impegni</h3>
            
            {filteredCommitments.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Nessun impegno nel mese selezionato
              </p>
            ) : (
              <div className="space-y-3">
                {filteredCommitments.map(commitment => (
                  <div 
                    key={commitment.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-commitment/10">
                        <CalendarCheck className="w-4 h-4 text-commitment" />
                      </div>
                      <div>
                        <p className="font-medium">{commitment.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryLabel(commitment.category)} • {commitment.executionDate?.isIndefinite ? 'Data indefinita' : formatDate(commitment.executionDate?.date || null, commitment.executionDate?.isMonthOnly || false)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-commitment">
                        {formatCurrency(commitment.amount)}
                      </span>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(commitment)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="mt-6 space-y-4">
          {/* Credits Summary */}
          <div className="glass rounded-2xl p-5 border-l-4 border-success">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <h3 className="font-semibold">Riepilogo Crediti</h3>
                {useProbabilistic && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    Ponderato
                  </span>
                )}
              </div>
              <span className="text-2xl font-bold text-success">
                {formatCurrency(filteredCredits.reduce((sum, t) => sum + getCreditAmount(t), 0))}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{filteredCredits.length} crediti nel mese</p>
          </div>

          {/* Credits List */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Elenco Crediti</h3>
            
            {filteredCredits.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Nessun credito nel mese selezionato
              </p>
            ) : (
              <div className="space-y-3">
                {filteredCredits.map(credit => (
                  <div 
                    key={credit.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <TrendingUp className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{credit.description}</p>
                          {credit.probability && credit.probability < 100 && (
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {credit.probability}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryLabel(credit.category)} • {credit.executionDate?.isIndefinite ? 'Data indefinita' : formatDate(credit.executionDate?.date || null, credit.executionDate?.isMonthOnly || false)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold text-success">
                          {formatCurrency(useProbabilistic ? getCreditAmount(credit) : credit.amount)}
                        </span>
                        {useProbabilistic && credit.probability && credit.probability < 100 && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatCurrency(credit.amount)}
                          </p>
                        )}
                      </div>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(credit)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Investments Tab */}
        <TabsContent value="investments" className="mt-6 space-y-4">
          {/* Investments Summary */}
          <div className="glass rounded-2xl p-5 border-l-4 border-investment">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-investment" />
                <h3 className="font-semibold">Riepilogo Investimenti</h3>
              </div>
              <span className="text-2xl font-bold text-investment">
                {formatCurrency(filteredInvestments.reduce((sum, t) => sum + t.amount, 0))}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{filteredInvestments.length} investimenti nel mese</p>
          </div>

          {/* Investments List */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Elenco Investimenti</h3>
            
            {filteredInvestments.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Nessun investimento nel mese selezionato
              </p>
            ) : (
              <div className="space-y-3">
                {filteredInvestments.map(investment => (
                  <div 
                    key={investment.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-investment/10">
                        <LineChart className="w-4 h-4 text-investment" />
                      </div>
                      <div>
                        <p className="font-medium">{investment.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryLabel(investment.category, 'investment')} • {investment.executionDate?.isIndefinite ? 'Data indefinita' : formatDate(investment.executionDate?.date || null, investment.executionDate?.isMonthOnly || false)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-investment">
                        {formatCurrency(investment.amount)}
                      </span>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(investment)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
