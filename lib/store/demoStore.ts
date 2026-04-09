import { create } from 'zustand';
import { EnforcementCheck } from '@/types/enforcement';

type DemoPhase = 'setup' | 'attack' | 'blocked' | 'zkproof';

interface DemoStoreState {
  currentPhase: DemoPhase;
  isRunning: boolean;
  checkResults: EnforcementCheck[];
  attackLatency: number;
  zkLatency: number;
  setPhase: (phase: DemoPhase) => void;
  setIsRunning: (running: boolean) => void;
  addCheckResult: (check: EnforcementCheck) => void;
  setAttackLatency: (ms: number) => void;
  setZkLatency: (ms: number) => void;
  reset: () => void;
}

export const useDemoStore = create<DemoStoreState>((set) => ({
  currentPhase: 'setup',
  isRunning: false,
  checkResults: [],
  attackLatency: 0,
  zkLatency: 0,
  setPhase: (phase) => set({ currentPhase: phase }),
  setIsRunning: (running) => set({ isRunning: running }),
  addCheckResult: (check) => set((state) => ({ checkResults: [...state.checkResults, check] })),
  setAttackLatency: (ms) => set({ attackLatency: ms }),
  setZkLatency: (ms) => set({ zkLatency: ms }),
  reset: () => set({ currentPhase: 'setup', isRunning: false, checkResults: [], attackLatency: 0, zkLatency: 0 }),
}));
