'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * Avatar Component for Leora Platform
 *
 * User profile images with automatic fallback to initials.
 * Follows Leora's brand aesthetic with appropriate sizing
 * and color usage.
 *
 * Features:
 * - Automatic fallback to user initials
 * - Multiple size variants
 * - Loading state with skeleton
 * - Accessible with proper ARIA labels
 *
 * @example
 * ```tsx
 * <Avatar>
 *   <AvatarImage src="/avatars/john.jpg" alt="John Smith" />
 *   <AvatarFallback>JS</AvatarFallback>
 * </Avatar>
 *
 * // With custom size
 * <Avatar size="lg">
 *   <AvatarImage src="/avatars/jane.jpg" alt="Jane Doe" />
 *   <AvatarFallback>JD</AvatarFallback>
 * </Avatar>
 * ```
 */

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        sm: 'h-8 w-8',
        default: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const avatarFallbackVariants = cva(
  'flex h-full w-full items-center justify-center rounded-full bg-muted dark:bg-muted-dark font-medium text-muted-foreground dark:text-muted-foreground-dark',
  {
    variants: {
      size: {
        sm: 'text-caption',
        default: 'text-label',
        lg: 'text-body-md',
        xl: 'text-heading-md',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={clsx(avatarVariants({ size }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={clsx('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>,
    VariantProps<typeof avatarFallbackVariants> {}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={clsx(avatarFallbackVariants({ size }), className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/**
 * Helper function to generate user initials from name
 * @param name - Full name of the user
 * @returns Uppercase initials (max 2 characters)
 */
function getInitials(name: string): string {
  if (!name || typeof name !== 'string') return '?';

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * User Avatar - Convenience component with automatic initials
 */
interface UserAvatarProps extends AvatarProps {
  src?: string;
  name: string;
  alt?: string;
}

function UserAvatar({ src, name, alt, size, className, ...props }: UserAvatarProps) {
  const initials = getInitials(name);

  return (
    <Avatar size={size} className={className} {...props}>
      {src && <AvatarImage src={src} alt={alt || name} />}
      <AvatarFallback size={size}>{initials}</AvatarFallback>
    </Avatar>
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  UserAvatar,
  getInitials,
  avatarVariants,
  avatarFallbackVariants,
};
export type { AvatarProps, AvatarFallbackProps, UserAvatarProps };
