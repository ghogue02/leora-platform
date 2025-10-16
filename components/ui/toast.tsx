'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Toast Notification System for Leora Platform
 *
 * Follows Leora brand guidelines:
 * - No emojis in messaging
 * - Warm, assured, succinct copy
 * - Uses Lucide icons (outline only)
 * - Brand colors for semantic states
 */

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-card border-2 p-4 shadow-card transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-slide-up data-[state=closed]:animate-fade-out data-[swipe=end]:animate-swipe-out',
  {
    variants: {
      variant: {
        default: 'border-border bg-panel-light text-ink dark:border-border-dark dark:bg-panel-dark dark:text-foreground-dark',
        success: 'border-success bg-success/10 text-success-foreground',
        warning: 'border-warning bg-warning/10 text-warning-foreground',
        destructive: 'border-destructive bg-destructive/10 text-destructive-foreground',
        info: 'border-indigo bg-indigo/10 text-ink dark:text-foreground-dark',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface ToastProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  onClose?: () => void;
}

export function Toast({
  variant,
  title,
  description,
  action,
  onClose,
  className,
  ...props
}: ToastProps) {
  return (
    <div className={clsx(toastVariants({ variant }), className)} {...props}>
      <div className="flex-1 space-y-1">
        {title && (
          <div className="font-semibold text-body-md leading-none">{title}</div>
        )}
        {description && (
          <div className="text-body-sm opacity-90">{description}</div>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-button p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Toast container for managing multiple toasts
export function Toaster() {
  const [toasts, setToasts] = React.useState<Array<ToastProps & { id: string }>>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Expose toast function globally
  React.useEffect(() => {
    const showToast = (toast: Omit<ToastProps, 'onClose'> & { id?: string; duration?: number }) => {
      const id = toast.id || Math.random().toString(36).substring(2, 9);
      const duration = toast.duration ?? 5000;

      setToasts((prev) => [...prev, { ...toast, id, onClose: () => removeToast(id) }]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    };

    // @ts-ignore - Global toast helper
    window.toast = showToast;

    return () => {
      // @ts-ignore
      delete window.toast;
    };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} className="pointer-events-auto" />
      ))}
    </div>
  );
}

// TypeScript global declaration
declare global {
  interface Window {
    toast?: (toast: Omit<ToastProps, 'onClose'> & { id?: string; duration?: number }) => void;
  }
}

export { toastVariants };
export type { ToastProps };
