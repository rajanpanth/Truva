'use client';

import { UseFormReturn } from 'react-hook-form';
import { RegisterStep2Data } from '@/backend/validators/registerSchema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CHAINS } from '@/backend/utils/constants';

interface Step2ConfigProps {
  form: UseFormReturn<RegisterStep2Data>;
}

export function Step2Config({ form }: Step2ConfigProps) {
  const { register, formState: { errors }, setValue, watch } = form;
  const chains = watch('chains') ?? [];
  const spendingBehavior = watch('spending_behavior');

  const handleChainToggle = (chain: string) => {
    const current = chains;
    const next = current.includes(chain as typeof current[number])
      ? current.filter((c) => c !== chain)
      : [...current, chain as typeof current[number]];
    setValue('chains', next, { shouldValidate: true });
  };

  const handleSpendingChange = (value: string | null) => {
    if (!value) return;
    setValue('spending_behavior', value as RegisterStep2Data['spending_behavior']);
    const defaults: Record<string, number> = {
      conservative: 100,
      standard: 1000,
      aggressive: 10000,
    };
    if (defaults[value]) {
      setValue('max_tx_size', defaults[value]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Configuration</h2>
        <p className="text-sm text-[#B0BEC5]">Set operational parameters for your agent</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="max_tx_size" className="text-[#B0BEC5]">Max Transaction Size (SOL)</Label>
          <Input
            id="max_tx_size"
            type="number"
            {...register('max_tx_size', { valueAsNumber: true })}
            className="border-[#1E3A5F] bg-[#1A2F4A] text-white"
          />
          {errors.max_tx_size && (
            <p className="text-xs text-[#FF4757]">{errors.max_tx_size.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate_limit" className="text-[#B0BEC5]">Rate Limit (per hour)</Label>
          <Input
            id="rate_limit"
            type="number"
            {...register('rate_limit', { valueAsNumber: true })}
            className="border-[#1E3A5F] bg-[#1A2F4A] text-white"
          />
          {errors.rate_limit && (
            <p className="text-xs text-[#FF4757]">{errors.rate_limit.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[#B0BEC5]">Spending Behavior</Label>
        <Select value={spendingBehavior ?? ''} onValueChange={handleSpendingChange}>
          <SelectTrigger className="border-[#1E3A5F] bg-[#1A2F4A] text-white">
            <SelectValue placeholder="Select behavior" />
          </SelectTrigger>
          <SelectContent className="border-[#1E3A5F] bg-[#1A2F4A]">
            <SelectItem value="conservative" className="text-white hover:bg-[#1E3A5F]">
              Conservative (max 100 SOL)
            </SelectItem>
            <SelectItem value="standard" className="text-white hover:bg-[#1E3A5F]">
              Standard (max 1,000 SOL)
            </SelectItem>
            <SelectItem value="aggressive" className="text-white hover:bg-[#1E3A5F]">
              Aggressive (max 10,000 SOL)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[#B0BEC5]">Supported Chains</Label>
        <div className="flex flex-wrap gap-3">
          {CHAINS.map((chain) => {
            const isSelected = chains.includes(chain);
            return (
              <button
                key={chain}
                type="button"
                onClick={() => handleChainToggle(chain)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'border-[#00C896] bg-[#00C896]/10 text-[#00C896]'
                    : 'border-[#1E3A5F] bg-[#1A2F4A] text-[#B0BEC5] hover:border-[#00C896]/30'
                }`}
              >
                {chain.charAt(0).toUpperCase() + chain.slice(1)}
              </button>
            );
          })}
        </div>
        {errors.chains && (
          <p className="text-xs text-[#FF4757]">{errors.chains.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="metadata" className="text-[#B0BEC5]">Metadata JSON (optional)</Label>
        <Textarea
          id="metadata"
          {...register('metadata')}
          placeholder='{"permitted_actions": ["swap", "transfer"]}'
          className="min-h-[100px] border-[#1E3A5F] bg-[#1A2F4A] font-mono text-sm text-white placeholder:text-[#B0BEC5]/50"
        />
        {errors.metadata && (
          <p className="text-xs text-[#FF4757]">{errors.metadata.message}</p>
        )}
      </div>
    </div>
  );
}
