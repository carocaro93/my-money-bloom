import { useState } from 'react';
import { PiggyBank, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface PiggyBankAccount {
  id: string;
  label: string;
  type: 'piggybank';
}

interface PiggyBankManagerProps {
  transactions: Transaction[];
  piggyBanks: PiggyBankAccount[];
  onAddPiggyBank: (name: string) => void;
  onDeletePiggyBank: (id: string) => void;
}

export function PiggyBankManager({ 
  transactions, 
  piggyBanks, 
  onAddPiggyBank, 
  onDeletePiggyBank 
}: PiggyBankManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPiggyBankName, setNewPiggyBankName] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getPiggyBankBalance = (accountId: string) => {
    const accountTransactions = transactions.filter(
      t => t.account === accountId && t.type === 'transaction'
    );
    
    const income = accountTransactions
      .filter(t => t.flowType === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = accountTransactions
      .filter(t => t.flowType === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      income,
      expense,
      balance: income - expense,
      transactionCount: accountTransactions.length,
    };
  };

  const totalBalance = piggyBanks.reduce((sum, pb) => {
    return sum + getPiggyBankBalance(pb.id).balance;
  }, 0);

  const handleAddPiggyBank = () => {
    if (newPiggyBankName.trim()) {
      onAddPiggyBank(newPiggyBankName.trim());
      setNewPiggyBankName('');
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-warning" />
          Salvadanai
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Nuovo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea nuovo Salvadanaio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Nome del salvadanaio (es. Vacanze, Auto...)"
                value={newPiggyBankName}
                onChange={(e) => setNewPiggyBankName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPiggyBank()}
                maxLength={50}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleAddPiggyBank} disabled={!newPiggyBankName.trim()}>
                  Crea
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Summary */}
      <div className="glass rounded-2xl p-5 border-l-4 border-warning">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-warning" />
            <h3 className="font-semibold">Totale Salvadanai</h3>
          </div>
          <span className={cn(
            "text-2xl font-bold",
            totalBalance >= 0 ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(totalBalance)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{piggyBanks.length} salvadanai configurati</p>
      </div>

      {/* Piggy Bank Cards */}
      {piggyBanks.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <PiggyBank className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Nessun salvadanaio creato</p>
          <Button variant="outline" onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Crea il tuo primo salvadanaio
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {piggyBanks.map(account => {
            const stats = getPiggyBankBalance(account.id);
            return (
              <div key={account.id} className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-warning/30 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-warning/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-warning/10">
                        <PiggyBank className="w-6 h-6 text-warning" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{account.label}</h4>
                        <p className="text-xs text-muted-foreground">{stats.transactionCount} movimenti</p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare "{account.label}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Questa azione eliminerà il salvadanaio. Le transazioni associate rimarranno ma non saranno più collegate a questo conto.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDeletePiggyBank(account.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  {/* Balance */}
                  <div className={cn(
                    "rounded-xl p-4 mb-4 text-center",
                    stats.balance >= 0 
                      ? "bg-success/10 border border-success/20" 
                      : "bg-destructive/10 border border-destructive/20"
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">Saldo Attuale</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      stats.balance >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(stats.balance)}
                    </p>
                  </div>
                  
                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-card/50 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="w-3 h-3 text-success" />
                        <p className="text-xs text-muted-foreground">Versato</p>
                      </div>
                      <p className="font-semibold text-success">{formatCurrency(stats.income)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-card/50 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingDown className="w-3 h-3 text-destructive" />
                        <p className="text-xs text-muted-foreground">Prelevato</p>
                      </div>
                      <p className="font-semibold text-destructive">{formatCurrency(stats.expense)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
