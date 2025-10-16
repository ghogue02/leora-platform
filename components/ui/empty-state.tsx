import * as React from 'react';
import { FileQuestion, Inbox } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12', className)}>
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="h-12 w-12 text-slate-400" />
      </div>

      <h3 className="text-heading-md font-semibold mb-2">{title}</h3>

      {description && <p className="text-body-sm text-muted max-w-md mb-6">{description}</p>}

      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
};

export const EmptySearchState: React.FC<{ query: string }> = ({ query }) => {
  return (
    <EmptyState
      icon={FileQuestion}
      title="No results found"
      description={`We couldn't find any results for "${query}". Try adjusting your search terms.`}
    />
  );
};

export const EmptyTableState: React.FC<{ entity: string; onCreate?: () => void }> = ({
  entity,
  onCreate,
}) => {
  return (
    <EmptyState
      title={`No ${entity} yet`}
      description={`Get started by creating your first ${entity}.`}
      action={
        onCreate
          ? {
              label: `Create ${entity}`,
              onClick: onCreate,
            }
          : undefined
      }
    />
  );
};
