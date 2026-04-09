import { create } from 'zustand';
import { Agent } from '@/types/agent';

interface AgentStoreState {
  selectedAgent: Agent | null;
  filterTier: number | null;
  filterTaskType: string | null;
  searchQuery: string;
  setSelectedAgent: (agent: Agent | null) => void;
  setFilterTier: (tier: number | null) => void;
  setFilterTaskType: (taskType: string | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  selectedAgent: null,
  filterTier: null,
  filterTaskType: null,
  searchQuery: '',
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
  setFilterTier: (tier) => set({ filterTier: tier }),
  setFilterTaskType: (taskType) => set({ filterTaskType: taskType }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () => set({ filterTier: null, filterTaskType: null, searchQuery: '' }),
}));
