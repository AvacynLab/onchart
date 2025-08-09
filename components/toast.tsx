'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircleFillIcon, WarningIcon } from './icons';
import { cn } from '@/lib/utils';
import { DataSourceError, ParseError, RateLimitedError } from '@/lib/finance/errors';

const iconsByType: Record<'success' | 'error', ReactNode> = {
  success: <CheckCircleFillIcon />,
  error: <WarningIcon />,
};

export function toast(props: Omit<ToastProps, 'id'>) {
  return sonnerToast.custom((id) => (
    <Toast id={id} type={props.type} description={props.description} />
  ));
}

function Toast(props: ToastProps) {
  const { id, type, description } = props;

  const descriptionRef = useRef<HTMLDivElement>(null);
  const [multiLine, setMultiLine] = useState(false);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;

    const update = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
      const lines = Math.round(el.scrollHeight / lineHeight);
      setMultiLine(lines > 1);
    };

    update(); // initial check
    const ro = new ResizeObserver(update); // re-check on width changes
    ro.observe(el);

    return () => ro.disconnect();
  }, [description]);

  return (
    <div className="flex w-full toast-mobile:w-[356px] justify-center">
      <div
        data-testid="toast"
        key={id}
        className={cn(
          'bg-zinc-100 p-3 rounded-lg w-full toast-mobile:w-fit flex flex-row gap-3',
          multiLine ? 'items-start' : 'items-center',
        )}
      >
        <div
          data-type={type}
          className={cn(
            'data-[type=error]:text-red-600 data-[type=success]:text-green-600',
            { 'pt-1': multiLine },
          )}
        >
          {iconsByType[type]}
        </div>
        <div ref={descriptionRef} className="text-zinc-950 text-sm">
          {description}
        </div>
      </div>
    </div>
  );
}

interface ToastProps {
  id: string | number;
  type: 'success' | 'error';
  description: string;
}

/**
 * Convert a finance related error into a human friendly message.
 * This keeps error wording consistent across the application and
 * avoids leaking low level exception details to end users.
 */
export function financeErrorMessage(error: unknown): string {
  if (error instanceof RateLimitedError) {
    return 'Rate limit reached for data provider, please retry later.';
  }
  if (error instanceof DataSourceError) {
    return 'Failed to fetch data from the remote source.';
  }
  if (error instanceof ParseError) {
    return 'Received malformed data from the remote source.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred.';
}

/**
 * Convenience wrapper that displays a toast for a finance error
 * using {@link financeErrorMessage} to generate the description.
 */
export function toastFinanceError(error: unknown) {
  toast({ type: 'error', description: financeErrorMessage(error) });
}
