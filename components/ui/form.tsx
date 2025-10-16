import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormContextValue {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

const FormContext = React.createContext<FormContextValue>({ errors: {}, touched: {} });

const useFormField = () => {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error('Form components must be used within a Form');
  }
  return context;
};

const Form = React.forwardRef<HTMLFormElement, React.FormHTMLAttributes<HTMLFormElement>>(
  ({ className, ...props }, ref) => {
    return (
      <form
        ref={ref}
        className={cn('space-y-6', className)}
        {...props}
      />
    );
  }
);
Form.displayName = 'Form';

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, name, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('space-y-2', className)}
        data-field-name={name}
        {...props}
      />
    );
  }
);
FormField.displayName = 'FormField';

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('text-label font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
        {...props}
      />
    );
  }
);
FormLabel.displayName = 'FormLabel';

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-body-sm text-muted', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-body-sm text-red-600 font-medium', className)}
      {...props}
    >
      {children}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

export { Form, FormField, FormLabel, FormDescription, FormMessage };
