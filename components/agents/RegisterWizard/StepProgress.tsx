'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function StepProgress({ currentStep, totalSteps, labels }: StepProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  isCompleted && 'border-[#00C896] bg-[#00C896] text-[#0D1B2A]',
                  isCurrent && 'border-[#00C896] bg-transparent text-[#00C896]',
                  !isCompleted && !isCurrent && 'border-[#1E3A5F] text-[#B0BEC5]'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step}
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  isCurrent ? 'text-white' : 'text-[#B0BEC5]'
                )}
              >
                {labels[i]}
              </span>
            </div>
            {step < totalSteps && (
              <div
                className={cn(
                  'h-0.5 w-12',
                  isCompleted ? 'bg-[#00C896]' : 'bg-[#1E3A5F]'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
