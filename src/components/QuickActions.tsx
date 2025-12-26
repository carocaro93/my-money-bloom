import { ArrowDownLeft, ArrowUpRight, TrendingDown, TrendingUp, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionType, FlowType } from '@/types/finance';

interface QuickAction {
  type: TransactionType;
  flowType?: FlowType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface QuickActionsProps {
  onAction: (type: TransactionType, flowType?: FlowType) => void;
}

const actions: QuickAction[] = [
  {
    type: 'transaction',
    flowType: 'income',
    label: 'Entrata',
    icon: <ArrowDownLeft className="w-5 h-5" />,
    color: 'text-success',
    bgColor: 'bg-success/10 border-success/30 active:bg-success/20',
  },
  {
    type: 'transaction',
    flowType: 'expense',
    label: 'Uscita',
    icon: <ArrowUpRight className="w-5 h-5" />,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 border-destructive/30 active:bg-destructive/20',
  },
  {
    type: 'debt',
    label: 'Debito',
    icon: <TrendingDown className="w-5 h-5" />,
    color: 'text-warning',
    bgColor: 'bg-warning/10 border-warning/30 active:bg-warning/20',
  },
  {
    type: 'credit',
    label: 'Credito',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'text-credit',
    bgColor: 'bg-credit/10 border-credit/30 active:bg-credit/20',
  },
  {
    type: 'investment',
    label: 'Investimento',
    icon: <LineChart className="w-5 h-5" />,
    color: 'text-investment',
    bgColor: 'bg-investment/10 border-investment/30 active:bg-investment/20',
  },
];

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
      <div className="glass border-t border-border/50 px-2 py-3 safe-area-pb">
        <div className="flex justify-around gap-1">
          {actions.map((action) => (
            <button
              key={`${action.type}-${action.flowType || ''}`}
              onClick={() => onAction(action.type, action.flowType)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all",
                action.bgColor,
                action.color
              )}
            >
              {action.icon}
              <span className="text-[10px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
