import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardProps {
  balance: number;
  totalIncome: number;
  totalExpense: number;
}

export function Dashboard({ balance, totalIncome, totalExpense }: DashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-slide-up">
      {/* Balance Card */}
      <div className="col-span-full lg:col-span-2 glass rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-medium">Saldo Totale</span>
          </div>
          <p className={cn(
            "text-4xl font-bold tracking-tight",
            balance >= 0 ? "text-gradient" : "text-destructive"
          )}>
            {formatCurrency(balance)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Aggiornato in tempo reale
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
      </div>

      {/* Income Card */}
      <div className="glass rounded-2xl p-5 group hover:border-success/30 transition-colors duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-success/10">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
            +12%
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-1">Entrate</p>
        <p className="text-2xl font-bold text-success">
          {formatCurrency(totalIncome)}
        </p>
      </div>

      {/* Expense Card */}
      <div className="glass rounded-2xl p-5 group hover:border-destructive/30 transition-colors duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <TrendingDown className="w-5 h-5 text-destructive" />
          </div>
          <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full">
            -5%
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-1">Uscite</p>
        <p className="text-2xl font-bold text-destructive">
          {formatCurrency(totalExpense)}
        </p>
      </div>

      {/* Savings Highlight */}
      <div className="col-span-full glass rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <PiggyBank className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Salvadanai Totali</p>
            <p className="text-xl font-bold">{formatCurrency(850)}</p>
          </div>
        </div>
        <div className="hidden md:flex gap-6">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Vacanze</p>
            <p className="text-sm font-semibold">{formatCurrency(500)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Emergenze</p>
            <p className="text-sm font-semibold">{formatCurrency(350)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
