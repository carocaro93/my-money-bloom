import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Transaction, TransactionType, FlowType, CreditProbability, CATEGORIES, INVESTMENT_CATEGORIES, DateConfig, RecurrenceConfig } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SettlementData {
  isSettled: boolean;
  settlementDate: Date | null;
  isMonthOnly: boolean;
}

interface AccountOption {
  id: string;
  label: string;
  type: string;
}

interface TransferData {
  isTransfer: boolean;
  fromAccount: string;
  toAccount: string;
}

interface TransactionFormProps {
  transaction?: Transaction | null;
  accounts: AccountOption[];
  defaultType?: TransactionType;
  defaultFlowType?: FlowType;
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>, settlement?: SettlementData, transfer?: TransferData) => void;
  onCancel: () => void;
}

// Helper to determine flowType based on transaction type
const getFlowTypeForType = (t: TransactionType, currentFlow: FlowType): FlowType => {
  if (t === 'debt') return 'expense';
  if (t === 'credit') return 'income';
  if (t === 'investment') return 'expense';
  if (t === 'commitment') return 'expense';
  return currentFlow;
};

export function TransactionForm({ transaction, accounts, defaultType, defaultFlowType, onSubmit, onCancel }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(transaction?.type || defaultType || 'transaction');
  const [flowType, setFlowType] = useState<FlowType>(
    defaultFlowType || getFlowTypeForType(transaction?.type || defaultType || 'transaction', transaction?.flowType || 'expense')
  );
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [category, setCategory] = useState(transaction?.category || (transaction?.type === 'investment' ? INVESTMENT_CATEGORIES[0].id : CATEGORIES[0].id));
  const [accountId, setAccountId] = useState(transaction?.accountId || accounts[0]?.id || '');

  // Transfer state
  const [isTransfer, setIsTransfer] = useState(false);
  const [fromAccount, setFromAccount] = useState(accounts.find(a => a.type === 'main')?.id || accounts[0]?.id || '');
  const [toAccount, setToAccount] = useState(accounts.find(a => a.type === 'piggybank')?.id || accounts[1]?.id || '');

  // Update flowType and category when type changes
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'debt' || newType === 'commitment') {
      setFlowType('expense');
    } else if (newType === 'credit') {
      setFlowType('income');
    } else if (newType === 'investment') {
      setFlowType('expense');
      setCategory(INVESTMENT_CATEGORIES[0].id);
    } else {
      setCategory(CATEGORIES[0].id);
    }
  };
  
  const [isRecurring, setIsRecurring] = useState(transaction?.recurrence.isRecurring || false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    transaction?.recurrence.startDate.date || new Date()
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    transaction?.recurrence.endDate.date || undefined
  );
  const [isStartMonthOnly, setIsStartMonthOnly] = useState(transaction?.recurrence.startDate.isMonthOnly || false);
  const [isEndMonthOnly, setIsEndMonthOnly] = useState(transaction?.recurrence.endDate.isMonthOnly || false);
  const [isEndIndefinite, setIsEndIndefinite] = useState(transaction?.recurrence.endDate.isIndefinite ?? true);
  const [isStartIndefinite, setIsStartIndefinite] = useState(transaction?.recurrence.startDate.isIndefinite || false);

  const [executionDate, setExecutionDate] = useState<Date | undefined>(
    transaction?.executionDate?.date || undefined
  );
  const [isExecutionMonthOnly, setIsExecutionMonthOnly] = useState(
    transaction?.executionDate?.isMonthOnly || false
  );
  const [isExecutionIndefinite, setIsExecutionIndefinite] = useState(
    transaction?.executionDate?.isIndefinite ?? false
  );

  // Settlement state for debt/credit
  const [isSettled, setIsSettled] = useState(false);
  const [settlementDate, setSettlementDate] = useState<Date | undefined>(new Date());
  const [isSettlementMonthOnly, setIsSettlementMonthOnly] = useState(false);

  // Probability state for credits
  const [probability, setProbability] = useState<CreditProbability>(transaction?.probability || 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const recurrence: RecurrenceConfig = {
      isRecurring,
      startDate: {
        isMonthOnly: isStartMonthOnly,
        date: isStartIndefinite ? null : startDate || null,
        isIndefinite: isStartIndefinite,
      },
      endDate: {
        isMonthOnly: isEndMonthOnly,
        date: isEndIndefinite ? null : endDate || null,
        isIndefinite: isEndIndefinite,
      },
    };

    const executionConfig: DateConfig | undefined = !isRecurring
      ? {
          isMonthOnly: isExecutionMonthOnly,
          date: isExecutionIndefinite ? null : executionDate || null,
          isIndefinite: isExecutionIndefinite,
        }
      : undefined;

    const settlementData: SettlementData | undefined = isSettled && (type === 'debt' || type === 'credit')
      ? {
          isSettled: true,
          settlementDate: settlementDate || null,
          isMonthOnly: isSettlementMonthOnly,
        }
      : undefined;

    const transferData: TransferData | undefined = isTransfer && type === 'transaction'
      ? {
          isTransfer: true,
          fromAccount,
          toAccount,
        }
      : undefined;

    const finalAccountId = isTransfer ? fromAccount : accountId;

    // Non inviare se l'account non è valido
    if (!finalAccountId) {
      toast.error('Seleziona un conto valido');
      return;
    }

    onSubmit({
      type,
      flowType: isTransfer ? 'expense' : flowType,
      amount: parseFloat(amount) || 0,
      description,
      category,
      accountId: finalAccountId,
      recurrence,
      executionDate: executionConfig,
      probability: type === 'credit' ? probability : undefined,
    }, settlementData, transferData);
  };

  const formatDateDisplay = (date: Date | undefined, isMonthOnly: boolean) => {
    if (!date) return 'Seleziona data';
    return isMonthOnly 
      ? format(date, 'MMMM yyyy', { locale: it })
      : format(date, 'dd MMMM yyyy', { locale: it });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {transaction ? 'Modifica' : 'Nuova'} {
              type === 'transaction' ? 'Transazione' : 
              type === 'debt' ? 'Debito' : 
              type === 'credit' ? 'Credito' : 
              type === 'investment' ? 'Investimento' : 'Impegno'
            }
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-5 gap-1">
              {(['transaction', 'debt', 'credit', 'investment', 'commitment'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={cn(
                    "px-2 py-2 rounded-lg text-xs font-medium transition-all",
                    type === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {t === 'transaction' ? 'Transazione' : 
                   t === 'debt' ? 'Debito' : 
                   t === 'credit' ? 'Credito' : 
                   t === 'investment' ? 'Investimento' : 'Impegno'}
                </button>
              ))}
            </div>
          </div>

          {/* Transfer Toggle - only for transactions */}
          {type === 'transaction' && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div>
                <Label htmlFor="transfer" className="text-base">Trasferimento</Label>
                <p className="text-sm text-muted-foreground">Sposta fondi tra conti</p>
              </div>
              <Switch
                id="transfer"
                checked={isTransfer}
                onCheckedChange={setIsTransfer}
              />
            </div>
          )}

          {/* Flow Type - only show for transactions when not transfer */}
          {type === 'transaction' && !isTransfer && (
            <div className="space-y-2">
              <Label>Direzione</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={flowType === 'income' ? 'income' : 'outline'}
                  onClick={() => setFlowType('income')}
                >
                  Entrata
                </Button>
                <Button
                  type="button"
                  variant={flowType === 'expense' ? 'expense' : 'outline'}
                  onClick={() => setFlowType('expense')}
                >
                  Uscita
                </Button>
              </div>
            </div>
          )}

          {/* Amount & Description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Importo (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Input
                id="description"
                placeholder="Es. Affitto"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Category & Account */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(type === 'investment' ? INVESTMENT_CATEGORIES : CATEGORIES).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Regular Account - show when not transfer */}
            {!isTransfer && (
              <div className="space-y-2">
                <Label>Conto</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Transfer Accounts - show when transfer is enabled */}
          {type === 'transaction' && isTransfer && (
            <div className="space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-primary">
                <ArrowRight className="w-4 h-4" />
                <span className="font-medium">Dettagli Trasferimento</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Da Conto</Label>
                  <Select value={fromAccount} onValueChange={(value) => {
                    setFromAccount(value);
                    if (value === toAccount) {
                      const newTo = accounts.find(a => a.id !== value)?.id || '';
                      setToAccount(newTo);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>A Conto</Label>
                  <Select value={toAccount} onValueChange={setToAccount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.id !== fromAccount).map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Probability for Credits */}
          {type === 'credit' && (
            <div className="space-y-2 p-4 rounded-lg bg-success/10 border border-success/20">
              <Label>Probabilità di incasso</Label>
              <div className="grid grid-cols-4 gap-2">
                {([30, 50, 70, 100] as const).map((prob) => (
                  <button
                    key={prob}
                    type="button"
                    onClick={() => setProbability(prob)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      probability === prob
                        ? "bg-success text-success-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {prob}%
                  </button>
                ))}
              </div>
              {probability < 100 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Importo ponderato: {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format((parseFloat(amount) || 0) * probability / 100)}
                </p>
              )}
            </div>
          )}
          {/* Recurring Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
            <div>
              <Label htmlFor="recurring" className="text-base">Transazione Ricorrente</Label>
              <p className="text-sm text-muted-foreground">Ripeti ogni mese</p>
            </div>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {/* Date Configuration */}
          {isRecurring ? (
            <div className="space-y-4 p-4 rounded-lg bg-secondary/50">
              {/* Start Date */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Data Inizio</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="startMonthOnly"
                      checked={isStartMonthOnly}
                      onCheckedChange={(checked) => setIsStartMonthOnly(checked as boolean)}
                    />
                    <label htmlFor="startMonthOnly" className="text-sm text-muted-foreground">
                      Solo mese
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="startIndefinite"
                    checked={isStartIndefinite}
                    onCheckedChange={(checked) => setIsStartIndefinite(checked as boolean)}
                  />
                  <label htmlFor="startIndefinite" className="text-sm text-muted-foreground">
                    Indefinita (da sempre)
                  </label>
                </div>
                {!isStartIndefinite && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDateDisplay(startDate, isStartMonthOnly)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Data Fine</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="endMonthOnly"
                      checked={isEndMonthOnly}
                      onCheckedChange={(checked) => setIsEndMonthOnly(checked as boolean)}
                    />
                    <label htmlFor="endMonthOnly" className="text-sm text-muted-foreground">
                      Solo mese
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="endIndefinite"
                    checked={isEndIndefinite}
                    onCheckedChange={(checked) => setIsEndIndefinite(checked as boolean)}
                  />
                  <label htmlFor="endIndefinite" className="text-sm text-muted-foreground">
                    Indefinita (per sempre)
                  </label>
                </div>
                {!isEndIndefinite && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDateDisplay(endDate, isEndMonthOnly)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          ) : (
            /* One-time Transaction Date */
            <div className="space-y-2 p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between">
                <Label>Data {type !== 'transaction' ? 'di Esecuzione' : 'Transazione'}</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="executionMonthOnly"
                    checked={isExecutionMonthOnly}
                    onCheckedChange={(checked) => setIsExecutionMonthOnly(checked as boolean)}
                    disabled={isExecutionIndefinite}
                  />
                  <label htmlFor="executionMonthOnly" className="text-sm text-muted-foreground">
                    Solo mese
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="executionIndefinite"
                  checked={isExecutionIndefinite}
                  onCheckedChange={(checked) => setIsExecutionIndefinite(checked as boolean)}
                />
                <label htmlFor="executionIndefinite" className="text-sm text-muted-foreground">
                  Indefinita (data non definita)
                </label>
              </div>
              {!isExecutionIndefinite && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDateDisplay(executionDate, isExecutionMonthOnly)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={executionDate}
                      onSelect={setExecutionDate}
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}

          {/* Settlement option for debt/credit in edit mode */}
          {transaction && (type === 'debt' || type === 'credit') && (
            <div className="space-y-4 p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="settled"
                  checked={isSettled}
                  onCheckedChange={(checked) => setIsSettled(checked as boolean)}
                />
                <label htmlFor="settled" className="text-sm font-medium">
                  {type === 'debt' ? 'Segna come estinto (pagato)' : 'Segna come eseguito (incassato)'}
                </label>
              </div>
              
              {isSettled && (
                <div className="space-y-3 pl-6">
                  <p className="text-xs text-muted-foreground">
                    Verrà creata automaticamente una transazione di {type === 'debt' ? 'uscita' : 'entrata'} con l'importo di €{amount || '0'}
                  </p>
                  <div className="flex items-center justify-between">
                    <Label>Data {type === 'debt' ? 'pagamento' : 'incasso'}</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="settlementMonthOnly"
                        checked={isSettlementMonthOnly}
                        onCheckedChange={(checked) => setIsSettlementMonthOnly(checked as boolean)}
                      />
                      <label htmlFor="settlementMonthOnly" className="text-sm text-muted-foreground">
                        Solo mese
                      </label>
                    </div>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDateDisplay(settlementDate, isSettlementMonthOnly)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={settlementDate}
                        onSelect={setSettlementDate}
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Annulla
            </Button>
            <Button type="submit" className="flex-1">
              {transaction ? 'Salva Modifiche' : 'Aggiungi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
