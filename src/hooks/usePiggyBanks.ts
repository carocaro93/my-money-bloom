import { useState, useCallback } from 'react';
import { PiggyBankAccount } from '@/components/PiggyBankManager';

const DEFAULT_PIGGY_BANKS: PiggyBankAccount[] = [
  { id: 'savings1', label: 'Salvadanaio Vacanze', type: 'piggybank' },
  { id: 'savings2', label: 'Salvadanaio Emergenze', type: 'piggybank' },
];

export function usePiggyBanks() {
  const [piggyBanks, setPiggyBanks] = useState<PiggyBankAccount[]>(DEFAULT_PIGGY_BANKS);

  const addPiggyBank = useCallback((name: string) => {
    const newPiggyBank: PiggyBankAccount = {
      id: `piggy_${Date.now()}`,
      label: name,
      type: 'piggybank',
    };
    setPiggyBanks(prev => [...prev, newPiggyBank]);
  }, []);

  const deletePiggyBank = useCallback((id: string) => {
    setPiggyBanks(prev => prev.filter(pb => pb.id !== id));
  }, []);

  return {
    piggyBanks,
    addPiggyBank,
    deletePiggyBank,
  };
}
