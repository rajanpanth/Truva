import { useQuery } from '@tanstack/react-query';
import { Agent } from '@/types/agent';

interface UseAgentsOptions {
  tier?: number;
  taskType?: string;
  search?: string;
  isActive?: boolean;
}

async function fetchAgents(options: UseAgentsOptions = {}): Promise<Agent[]> {
  const params = new URLSearchParams();
  if (options.tier) params.set('tier', String(options.tier));
  if (options.taskType) params.set('task_type', options.taskType);
  if (options.search) params.set('search', options.search);
  if (options.isActive !== undefined) params.set('is_active', String(options.isActive));

  const res = await fetch(`/api/agents?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  const json = await res.json();
  return json.data;
}

async function fetchAgentById(id: string): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch agent');
  const json = await res.json();
  return json.data;
}

export function useAgents(options: UseAgentsOptions = {}) {
  return useQuery({
    queryKey: ['agents', options],
    queryFn: () => fetchAgents(options),
    refetchInterval: 10_000,
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: () => fetchAgentById(id),
    enabled: !!id,
  });
}
