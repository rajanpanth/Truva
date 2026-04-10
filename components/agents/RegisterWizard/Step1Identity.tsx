'use client';

import { UseFormReturn } from 'react-hook-form';
import { RegisterStep1Data } from '@/backend/validators/registerSchema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TASK_TYPE_LABELS } from '@/backend/utils/constants';

interface Step1IdentityProps {
  form: UseFormReturn<RegisterStep1Data>;
}

export function Step1Identity({ form }: Step1IdentityProps) {
  const { register, formState: { errors }, setValue, watch } = form;
  const taskType = watch('task_type');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Identity & PDA Setup</h2>
        <p className="text-sm text-[#B0BEC5]">Basic agent identity information</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[#B0BEC5]">Agent Name</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="e.g. TRUVA_UNIT_X"
            className="border-[#1E3A5F] bg-[#1A2F4A] text-white placeholder:text-[#B0BEC5]/50"
          />
          {errors.name && (
            <p className="text-xs text-[#FF4757]">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="public_key" className="text-[#B0BEC5]">Public Key (Solana)</Label>
          <Input
            id="public_key"
            {...register('public_key')}
            placeholder="Base58 address..."
            className="border-[#1E3A5F] bg-[#1A2F4A] font-mono text-white placeholder:text-[#B0BEC5]/50"
          />
          {errors.public_key && (
            <p className="text-xs text-[#FF4757]">{errors.public_key.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="operator_name" className="text-[#B0BEC5]">Operator Name</Label>
          <Input
            id="operator_name"
            {...register('operator_name')}
            placeholder="Your name or org"
            className="border-[#1E3A5F] bg-[#1A2F4A] text-white placeholder:text-[#B0BEC5]/50"
          />
          {errors.operator_name && (
            <p className="text-xs text-[#FF4757]">{errors.operator_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="operator_email" className="text-[#B0BEC5]">Operator Email</Label>
          <Input
            id="operator_email"
            type="email"
            {...register('operator_email')}
            placeholder="you@example.com"
            className="border-[#1E3A5F] bg-[#1A2F4A] text-white placeholder:text-[#B0BEC5]/50"
          />
          {errors.operator_email && (
            <p className="text-xs text-[#FF4757]">{errors.operator_email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[#B0BEC5]">Task Type</Label>
        <Select value={taskType} onValueChange={(v) => setValue('task_type', v as RegisterStep1Data['task_type'])}>
          <SelectTrigger className="border-[#1E3A5F] bg-[#1A2F4A] text-white">
            <SelectValue placeholder="Select task type" />
          </SelectTrigger>
          <SelectContent className="border-[#1E3A5F] bg-[#1A2F4A]">
            {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-white hover:bg-[#1E3A5F]">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.task_type && (
          <p className="text-xs text-[#FF4757]">{errors.task_type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-[#B0BEC5]">Description (optional)</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Define the primary logic loop of the agent..."
          className="min-h-[100px] border-[#1E3A5F] bg-[#1A2F4A] text-white placeholder:text-[#B0BEC5]/50"
        />
        {errors.description && (
          <p className="text-xs text-[#FF4757]">{errors.description.message}</p>
        )}
      </div>
    </div>
  );
}
