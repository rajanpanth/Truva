import { create } from 'zustand';
import { EnforcementCheck } from '@/backend/types/enforcement';

export interface DemoStoreState {
  currentPhase: number | null;
  isRunning: boolean;
  checkResults: EnforcementCheck[];
  latencies: { total: number };
  setCurrentPhase: (phase: number | null) => void;
  setIsRunning: (running: boolean) => void;
  setCheckResults: (results: EnforcementCheck[]) => void;
  setLatencies: (latencies: { total: number }) => void;
  reset: () => void;
}

export const useDemoStore = create<DemoStoreState>((set) => ({
  currentPhase: null,
  isRunning: false,
  checkResults: [],
  latencies: { total: 0 },
  setCurrentPhase: (phase) => set({ currentPhase: phase }),
  setIsRunning: (running) => set({ isRunning: running }),
  setCheckResults: (results) => set({ checkResults: results }),
  setLatencies: (latencies) => set({ latencies }),
  reset: () => set({ currentPhase: null, isRunning: false, checkResults: [], latencies: { total: 0 } }),
}));
