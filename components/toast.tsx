'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircleFillIcon, WarningIcon, InfoIcon } from './icons';
import { subscribeAIEvents, type AIEvent } from '@/lib/ai/event-engine';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

const iconsByType: Record<ToastType, ReactNode> = {
  success: <CheckCircleFillIcon />,
  error: <WarningIcon />,
  info: <InfoIcon />,
  warning: <WarningIcon />,
};

export function toast(props: Omit<ToastProps, 'id'>) {
  return sonnerToast.custom((id) => (
    <Toast id={id} type={props.type} description={props.description} />
  ));
}

/**
 * React component that listens to AI events and surfaces them as toast
 * notifications. It should be mounted once at the app level.
 */
export function AIEventToasts() {
  useEffect(() => {
    const unsubscribe = subscribeAIEvents((event: AIEvent) => {
      const description =
        event.message ??
        `${event.symbol} ${event.label ?? ''} @ ${event.price}`;
      toast({ type: (event.level as ToastType) ?? 'info', description });
    });

    return unsubscribe;
  }, []);

  return null;
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
  type: ToastType;
  description: string;
}
