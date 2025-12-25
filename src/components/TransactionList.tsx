import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  Pencil, 
  Trash2,
  Clock,
  CreditCard
} from 'lucide-react';
import { Transaction, CATEGORIES, ACCOUNTS } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  const [filter, setFilter] = useState<'all' | 'transaction' | 'debt' | 'credit'>('all');

  const filteredTransactions = transactions.filter(t => 
    filter === 'all' ? true : t.type === filter
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getCategory = (id: string) => CATEGORIES.find(c => c.id === id);
  const getAccount = (id: string) => ACCOUNTS.find(a => a.id === id);

  const getTypeLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'transaction': return 'Transazione';
      case 'debt': return 'Debito';
      case 'credit': return 'Credito';
    }
  };

  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'transaction': return 'bg-primary/10 text-primary';
      case 'debt': return 'bg-warning/10 text-warning';
      case 'credit': return 'bg-credit/10 text-credit';
    }
  };

  return (
    <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'transaction', 'debt', 'credit'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
              filter === f 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {f === 'all' ? 'Tutti' : getTypeLabel(f)}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Nessuna transazione trovata</p>
          </div>
        ) : (
          filteredTransactions.map((transaction, index) => {
            const category = getCategory(transaction.category);
            const account = getAccount(transaction.account);
            
            return (
              <div
                key={transaction.id}
                className="glass rounded-2xl p-4 hover:border-primary/30 transition-all duration-300 group animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0",
                    transaction.flowType === 'income' ? 'bg-success/10' : 'bg-destructive/10'
                  )}>
                    {category?.icon || (transaction.flowType === 'income' ? '📥' : '📤')}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{transaction.description}</h3>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        getTypeColor(transaction.type)
                      )}>
                        {getTypeLabel(transaction.type)}
                      </span>
                      {transaction.recurrence.isRecurring && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          Ricorrente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {account?.label}
                      </span>
                      <span>•</span>
                      <span>{category?.label}</span>
                      {transaction.executionDate?.date && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(transaction.executionDate.date, 'dd MMM yyyy', { locale: it })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-lg font-bold flex items-center gap-1",
                      transaction.flowType === 'income' ? 'text-success' : 'text-destructive'
                    )}>
                      {transaction.flowType === 'income' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(transaction)}
                      className="h-8 w-8"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(transaction.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
