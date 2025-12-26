import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { Dashboard } from '@/components/Dashboard';
import { TransactionList } from '@/components/TransactionList';
import { TransactionForm } from '@/components/TransactionForm';
import { PiggyBankManager } from '@/components/PiggyBankManager';
import { useTransactions } from '@/hooks/useTransactions';
import { usePiggyBanks } from '@/hooks/usePiggyBanks';
import { Transaction } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { 
    transactions, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction,
  } = useTransactions();

  const { piggyBanks, addPiggyBank, deletePiggyBank } = usePiggyBanks();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const handleAdd = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    toast({
      title: "Eliminato",
      description: "La transazione è stata eliminata con successo.",
    });
  };

  const handleSubmit = (data: Omit<Transaction, 'id' | 'createdAt'>, settlement?: { isSettled: boolean; settlementDate: Date | null; isMonthOnly: boolean }) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, data);
      toast({
        title: "Aggiornato",
        description: "La transazione è stata modificata con successo.",
      });

      // If settlement is requested, create the corresponding transaction
      if (settlement?.isSettled && settlement.settlementDate) {
        const settlementTransaction: Omit<Transaction, 'id' | 'createdAt'> = {
          type: 'transaction',
          flowType: data.type === 'debt' ? 'expense' : 'income',
          amount: data.amount,
          description: `${data.type === 'debt' ? 'Pagamento' : 'Incasso'}: ${data.description}`,
          category: data.category,
          account: data.account,
          recurrence: {
            isRecurring: false,
            startDate: {
              isMonthOnly: settlement.isMonthOnly,
              date: settlement.settlementDate,
              isIndefinite: false,
            },
            endDate: {
              isMonthOnly: false,
              date: null,
              isIndefinite: true,
            },
          },
        };
        addTransaction(settlementTransaction);
        toast({
          title: data.type === 'debt' ? "Debito estinto" : "Credito incassato",
          description: `Transazione di ${data.type === 'debt' ? 'pagamento' : 'incasso'} creata automaticamente.`,
        });
      }
    } else {
      addTransaction(data);
      toast({
        title: "Aggiunto",
        description: "La nuova transazione è stata aggiunta.",
      });
    }
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Finanze</h1>
              <p className="text-xs text-muted-foreground">Gestisci le tue finanze</p>
            </div>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Aggiungi</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Dashboard transactions={transactions} onEdit={handleEdit} />
        
        <PiggyBankManager
          transactions={transactions}
          piggyBanks={piggyBanks}
          onAddPiggyBank={addPiggyBank}
          onDeletePiggyBank={deletePiggyBank}
        />
        
        <div>
          <h2 className="text-lg font-semibold mb-4">Tutte le Transazioni</h2>
          <TransactionList 
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </main>

      {/* Transaction Form Modal */}
      {isFormOpen && (
        <TransactionForm
          transaction={editingTransaction}
          accounts={[
            { id: 'main', label: 'Conto principale', type: 'main' },
            { id: 'card', label: 'Carta di credito', type: 'card' },
            ...piggyBanks.map(pb => ({ id: pb.id, label: pb.label, type: pb.type })),
          ]}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default Index;
