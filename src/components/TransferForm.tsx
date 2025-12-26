import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface AccountOption {
  id: string;
  label: string;
  type: string;
}

interface TransferFormProps {
  accounts: AccountOption[];
  onSubmit: (data: {
    fromAccount: string;
    toAccount: string;
    amount: number;
    description: string;
    date: Date;
  }) => void;
  onCancel: () => void;
}

export function TransferForm({ accounts, onSubmit, onCancel }: TransferFormProps) {
  const [fromAccount, setFromAccount] = useState(accounts.find(a => a.type === 'main')?.id || accounts[0]?.id || '');
  const [toAccount, setToAccount] = useState(accounts.find(a => a.type === 'piggybank')?.id || accounts[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromAccount || !toAccount || fromAccount === toAccount) return;
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSubmit({
      fromAccount,
      toAccount,
      amount: parsedAmount,
      description: description.trim() || 'Trasferimento',
      date,
    });
  };

  const getAccountLabel = (id: string) => accounts.find(a => a.id === id)?.label || id;

  const availableToAccounts = accounts.filter(a => a.id !== fromAccount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Trasferimento</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* From Account */}
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

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="p-2 rounded-full bg-primary/10">
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
          </div>

          {/* To Account */}
          <div className="space-y-2">
            <Label>A Conto</Label>
            <Select value={toAccount} onValueChange={setToAccount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableToAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Importo (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione (opzionale)</Label>
            <Input
              id="description"
              placeholder="Es. Versamento mensile"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'dd MMMM yyyy', { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={it}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Preview */}
          {fromAccount && toAccount && amount && parseFloat(amount) > 0 && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-center">
                <span className="font-medium">{getAccountLabel(fromAccount)}</span>
                <ArrowRight className="w-4 h-4 inline mx-2" />
                <span className="font-medium">{getAccountLabel(toAccount)}</span>
              </p>
              <p className="text-center text-lg font-bold text-primary mt-1">
                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(parseFloat(amount))}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Annulla
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!fromAccount || !toAccount || fromAccount === toAccount || !amount || parseFloat(amount) <= 0}
            >
              Trasferisci
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
