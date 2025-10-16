import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * Badge Component for Leora Platform
 *
 * Used for status indicators, tags, and labels throughout the portal.
 * Follows Leora brand guidelines with appropriate color usage.
 *
 * Variants:
 * - default: Neutral slate for general labels
 * - primary: Gold accent for important highlights (use sparingly)
 * - success: Green for positive states (completed, active)
 * - warning: Orange for attention items (pending, at-risk)
 * - destructive: Red for errors or critical items
 * - outline: Bordered variant for subtle emphasis
 *
 * @example
 * ```tsx
 * <Badge variant="success">Delivered</Badge>
 * <Badge variant="warning">Payment Due</Badge>
 * <Badge variant="outline">Draft</Badge>
 * ```
 */

const badgeVariants = cva(
  'inline-flex items-center rounded-button border-2 px-2.5 py-0.5 text-caption font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
        primary:
          'border-transparent bg-gold text-ink',
        success:
          'border-transparent bg-success/10 text-success border-success',
        warning:
          'border-transparent bg-warning/10 text-warning border-warning',
        destructive:
          'border-transparent bg-destructive/10 text-destructive border-destructive',
        info:
          'border-transparent bg-indigo/10 text-indigo border-indigo',
        outline:
          'border-border text-foreground dark:border-border-dark dark:text-foreground-dark',
      },
      size: {
        default: 'px-2.5 py-0.5 text-caption',
        sm: 'px-2 py-0.5 text-[0.625rem]',
        lg: 'px-3 py-1 text-label',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={clsx(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
