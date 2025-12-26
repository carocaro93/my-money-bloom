import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { Dashboard } from '@/components/Dashboard';
import { TransactionList } from '@/components/TransactionList';
import { TransactionForm } from '@/components/TransactionForm';
import { useTransactions } from '@/hooks/useTransactions';
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

  const handleSubmit = (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, data);
      toast({
        title: "Aggiornato",
        description: "La transazione è stata modificata con successo.",
      });
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
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default Index;
