import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { Transaction, TransactionType, FlowType, CATEGORIES, ACCOUNTS, DateConfig, RecurrenceConfig } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TransactionFormProps {
  transaction?: Transaction | null;
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function TransactionForm({ transaction, onSubmit, onCancel }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(transaction?.type || 'transaction');
  const [flowType, setFlowType] = useState<FlowType>(transaction?.flowType || 'expense');
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [category, setCategory] = useState(transaction?.category || CATEGORIES[0].id);
  const [account, setAccount] = useState(transaction?.account || ACCOUNTS[0].id);
  
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

    const executionConfig: DateConfig | undefined = !isRecurring && executionDate
      ? {
          isMonthOnly: isExecutionMonthOnly,
          date: executionDate,
          isIndefinite: false,
        }
      : undefined;

    onSubmit({
      type,
      flowType,
      amount: parseFloat(amount) || 0,
      description,
      category,
      account,
      recurrence,
      executionDate: executionConfig,
    });
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
            {transaction ? 'Modifica' : 'Nuova'} {type === 'transaction' ? 'Transazione' : type === 'debt' ? 'Debito' : 'Credito'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['transaction', 'debt', 'credit'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    type === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {t === 'transaction' ? 'Transazione' : t === 'debt' ? 'Debito' : 'Credito'}
                </button>
              ))}
            </div>
          </div>

          {/* Flow Type */}
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
                  {CATEGORIES.map((cat) => (
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
            <div className="space-y-2">
              <Label>Conto</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNTS.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                  />
                  <label htmlFor="executionMonthOnly" className="text-sm text-muted-foreground">
                    Solo mese
                  </label>
                </div>
              </div>
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
