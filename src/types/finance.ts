export type TransactionType = 'transaction' | 'debt' | 'credit' | 'investment';
export type FlowType = 'income' | 'expense';
export type CreditProbability = 30 | 50 | 70 | 100;

export interface DateConfig {
  isMonthOnly: boolean;
  date: Date | null;
  isIndefinite?: boolean;
}

export interface RecurrenceConfig {
  isRecurring: boolean;
  startDate: DateConfig;
  endDate: DateConfig;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  flowType: FlowType;
  amount: number;
  description: string;
  category: string;
  account: string;
  recurrence: RecurrenceConfig;
  executionDate?: DateConfig;
  probability?: CreditProbability; // Solo per crediti
  createdAt: Date;
}

export const CATEGORIES = [
  { id: 'utilities', label: 'Utenze personali', icon: '💡' },
  { id: 'savings', label: 'Accantonamenti', icon: '🏦' },
  { id: 'gifts', label: 'Regali ad altri', icon: '🎁' },
  { id: 'travel', label: 'Viaggi', icon: '✈️' },
  { id: 'dining', label: 'Ristoranti / Luxury', icon: '🍽️' },
  { id: 'entertainment', label: 'Svago e autoregali', icon: '🎮' },
] as const;

export const INVESTMENT_CATEGORIES = [
  { id: 'financial', label: 'Finanziario', icon: '📈' },
  { id: 'capital', label: 'Conto Capitale', icon: '🏢' },
] as const;

export const ACCOUNTS = [
  { id: 'main', label: 'Conto principale', type: 'main' },
  { id: 'savings1', label: 'Salvadanaio Vacanze', type: 'piggybank' },
  { id: 'savings2', label: 'Salvadanaio Emergenze', type: 'piggybank' },
  { id: 'card', label: 'Carta di credito', type: 'card' },
] as const;
