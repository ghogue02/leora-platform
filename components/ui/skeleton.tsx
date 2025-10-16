import * as React from 'react';
import { clsx } from 'clsx';

/**
 * Skeleton Component for Leora Platform
 *
 * Loading placeholder that matches the brand's aesthetic.
 * Uses subtle animation and Leora's muted colors for a refined
 * loading experience.
 *
 * @example
 * ```tsx
 * // Loading a card
 * <Card>
 *   <Skeleton className="h-8 w-48 mb-4" />
 *   <Skeleton className="h-4 w-full mb-2" />
 *   <Skeleton className="h-4 w-3/4" />
 * </Card>
 *
 * // Loading a list
 * {Array.from({ length: 5 }).map((_, i) => (
 *   <Skeleton key={i} className="h-12 w-full mb-2" />
 * ))}
 * ```
 */

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-card bg-muted dark:bg-muted-dark',
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton Text - Pre-configured for common text loading states
 */
function SkeletonText({
  lines = 3,
  className
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx(
            'h-4',
            i === lines - 1 ? 'w-4/5' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton Card - Pre-configured card loading state
 */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-card border-2 border-border dark:border-border-dark p-6 space-y-4', className)}>
      <Skeleton className="h-6 w-2/3" />
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

/**
 * Skeleton Table - Pre-configured table loading state
 */
function SkeletonTable({
  rows = 5,
  columns = 4,
  className
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b-2 border-border dark:border-border-dark">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable };
