import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { Dashboard } from '@/components/Dashboard';
import { TransactionList } from '@/components/TransactionList';
import { TransactionForm } from '@/components/TransactionForm';
import { PiggyBankManager } from '@/components/PiggyBankManager';
import { QuickActions } from '@/components/QuickActions';
import { useTransactions } from '@/hooks/useTransactions';
import { usePiggyBanks } from '@/hooks/usePiggyBanks';
import { Transaction, TransactionType, FlowType } from '@/types/finance';
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
  const [defaultType, setDefaultType] = useState<TransactionType | undefined>(undefined);
  const [defaultFlowType, setDefaultFlowType] = useState<FlowType | undefined>(undefined);
  const { toast } = useToast();

  const allAccounts = [
    { id: 'main', label: 'Conto principale', type: 'main' },
    { id: 'card', label: 'Carta di credito', type: 'card' },
    ...piggyBanks.map(pb => ({ id: pb.id, label: pb.label, type: pb.type })),
  ];

  const handleAdd = () => {
    setEditingTransaction(null);
    setDefaultType(undefined);
    setDefaultFlowType(undefined);
    setIsFormOpen(true);
  };

  const handleQuickAction = (type: TransactionType, flowType?: FlowType) => {
    setEditingTransaction(null);
    setDefaultType(type);
    setDefaultFlowType(flowType);
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

  const handleSubmit = (
    data: Omit<Transaction, 'id' | 'createdAt'>, 
    settlement?: { isSettled: boolean; settlementDate: Date | null; isMonthOnly: boolean },
    transfer?: { isTransfer: boolean; fromAccount: string; toAccount: string }
  ) => {
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
    } else if (transfer?.isTransfer) {
      // Handle transfer - create two transactions
      const expenseTransaction: Omit<Transaction, 'id' | 'createdAt'> = {
        ...data,
        flowType: 'expense',
        account: transfer.fromAccount,
        description: `Trasferimento: ${data.description}`,
      };

      const incomeTransaction: Omit<Transaction, 'id' | 'createdAt'> = {
        ...data,
        flowType: 'income',
        account: transfer.toAccount,
        description: `Trasferimento: ${data.description}`,
      };

      addTransaction(expenseTransaction);
      addTransaction(incomeTransaction);

      toast({
        title: "Trasferimento completato",
        description: `${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(data.amount)} trasferiti con successo.`,
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
    setDefaultType(undefined);
    setDefaultFlowType(undefined);
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
      <main className="container mx-auto px-4 py-6 pb-28 md:pb-6 space-y-6">
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

      {/* Quick Actions - Mobile Only */}
      <QuickActions onAction={handleQuickAction} />

      {/* Transaction Form Modal */}
      {isFormOpen && (
        <TransactionForm
          transaction={editingTransaction}
          accounts={allAccounts}
          defaultType={defaultType}
          defaultFlowType={defaultFlowType}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}

    </div>
  );
};

export default Index;
