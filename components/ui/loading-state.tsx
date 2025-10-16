import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  text = 'Loading...',
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-gold-500', sizeClasses[size])} />
      {text && <p className="text-body-sm text-muted">{text}</p>}
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={cn('leora-skeleton h-4 w-full', className)} />;
};

export const LoadingCard: React.FC = () => {
  return (
    <div className="leora-card space-y-4">
      <LoadingSkeleton className="h-6 w-3/4" />
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-2/3" />
    </div>
  );
};

export const LoadingTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
};
