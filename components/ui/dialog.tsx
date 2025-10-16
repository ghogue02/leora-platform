import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

const useDialog = () => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
};

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open = false, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}) }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { onOpenChange } = useDialog();

  return (
    <button
      ref={ref}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(true);
      }}
      {...props}
    />
  );
});
DialogTrigger.displayName = 'DialogTrigger';

const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { open } = useDialog();

  if (!open) return null;

  return <>{children}</>;
};

const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { onOpenChange } = useDialog();

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-[1300] bg-ink/50 backdrop-blur-sm',
          'animate-fade-in',
          className
        )}
        onClick={() => onOpenChange(false)}
        {...props}
      />
    );
  }
);
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { onOpenChange } = useDialog();

    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false);
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [onOpenChange]);

    return (
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4">
          <div
            ref={ref}
            className={cn(
              'relative w-full max-w-lg bg-background border border-border rounded-elevated shadow-elevated',
              'animate-scale-in',
              className
            )}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {children}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-button p-1 hover:bg-muted transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogPortal>
    );
  }
);
DialogContent.displayName = 'DialogContent';

const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6 border-b border-border', className)}
      {...props}
    />
  )
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-end gap-2 p-6 border-t border-border', className)}
      {...props}
    />
  )
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-heading-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-body-sm text-muted', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
