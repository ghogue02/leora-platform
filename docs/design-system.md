# Leora Design System Documentation

## Overview

The Leora Design System provides a comprehensive set of design tokens, components, and patterns for building consistent, accessible, and beautiful user interfaces across the Leora Platform.

## Brand Colors

### Primary Palette

- **Ivory** (`#F9F7F3`) - Background, light surfaces
- **Ink** (`#0B0B0B`) - Primary text, dark surfaces
- **Gold** (`#C8A848`) - Accent, CTAs, interactive elements
- **Slate** (`#5B6573`) - Secondary text, subdued elements

### Semantic Colors

- **Background**: Ivory (light) / Ink (dark)
- **Foreground**: Ink (light) / Ivory (dark)
- **Border**: `#E5DFD3` (light) / `#2A2E3A` (dark)
- **Muted**: `#F1EDE5` (light) / `#1A1C27` (dark)
- **Accent**: Gold (light) / `#DDCA7D` (dark)

## Typography

### Font Family

- **Sans**: Inter (primary), DejaVu Sans (fallback)
- **Mono**: System monospace fonts

### Type Scale

| Style | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| Display Large | 64px (4rem) | 1.1 | 600 | Hero sections |
| Display Medium | 48px (3rem) | 1.15 | 600 | Page headers |
| Display Small | 36px (2.25rem) | 1.2 | 600 | Section headers |
| Heading XL | 32px (2rem) | 1.25 | 600 | Major headings |
| Heading Large | 24px (1.5rem) | 1.3 | 600 | Card titles |
| Heading Medium | 20px (1.25rem) | 1.35 | 600 | Subheadings |
| Heading Small | 18px (1.125rem) | 1.4 | 600 | Small headers |
| Body Large | 18px (1.125rem) | 1.6 | 400 | Large text |
| Body Medium | 16px (1rem) | 1.6 | 400 | Body text |
| Body Small | 14px (0.875rem) | 1.5 | 400 | Small text |
| Caption | 12px (0.75rem) | 1.5 | 500 | Captions |
| Label | 14px (0.875rem) | 1.5 | 500 | Form labels |

## Spacing

Based on 4px grid system:

- `xs`: 4px (0.25rem)
- `sm`: 8px (0.5rem)
- `md`: 16px (1rem)
- `lg`: 24px (1.5rem)
- `xl`: 32px (2rem)
- `2xl`: 48px (3rem)
- `3xl`: 64px (4rem)
- `4xl`: 96px (6rem)

## Border Radius

- **Card**: 14px - Standard cards and containers
- **Elevated**: 18px - Elevated surfaces and modals
- **Button**: 10px - Buttons and interactive elements
- **Input**: 8px - Form inputs and controls
- **Small**: 6px - Small elements
- **Full**: 9999px - Pills and circular elements

## Shadows

### Light Theme

- **Card**: `0 2px 8px rgba(11, 11, 11, 0.08)`
- **Card Hover**: `0 4px 16px rgba(11, 11, 11, 0.12)`
- **Elevated**: `0 8px 24px rgba(11, 11, 11, 0.16)`
- **Focus**: `0 0 0 3px rgba(200, 168, 72, 0.3)`

### Dark Theme

- **Card**: `0 2px 8px rgba(0, 0, 0, 0.24)`
- **Card Hover**: `0 4px 16px rgba(0, 0, 0, 0.32)`
- **Elevated**: `0 8px 24px rgba(0, 0, 0, 0.4)`
- **Focus**: `0 0 0 3px rgba(221, 202, 125, 0.4)`

## Components

### Button

Variants:
- `default` - Ink background, ivory text
- `primary` - Gold background, ink text
- `secondary` - Slate background
- `outline` - Border only
- `ghost` - No background
- `link` - Text with underline
- `destructive` - Red for dangerous actions

Sizes: `sm`, `md`, `lg`, `icon`

```tsx
<Button variant="primary" size="md">Click me</Button>
```

### Card

Standard container with border and shadow.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### Input

Form input with error states and icon support.

```tsx
<Input
  type="email"
  placeholder="Enter email"
  icon={<Mail />}
  error={hasError}
/>
```

### Select

Dropdown select with custom styling.

```tsx
<Select>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</Select>
```

### Table

Data table with header, body, and footer sections.

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Value</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Dialog

Modal dialog with overlay and close button.

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    Content
    <DialogFooter>
      <Button>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form

Form field container with label and error states.

```tsx
<Form>
  <FormField>
    <FormLabel>Email</FormLabel>
    <Input type="email" />
    <FormDescription>Helper text</FormDescription>
    <FormMessage>Error message</FormMessage>
  </FormField>
</Form>
```

## Layout Components

### Header

Top navigation bar with logo, search, and user menu.

```tsx
<Header onMenuClick={toggleSidebar} />
```

### Sidebar

Collapsible sidebar navigation.

```tsx
<Sidebar collapsed={isCollapsed} />
```

### PortalLayout

Complete portal layout with header, sidebar, and main content area.

```tsx
<PortalLayout>
  <YourPageContent />
</PortalLayout>
```

## Loading States

### LoadingState

Centered loading spinner with text.

```tsx
<LoadingState text="Loading data..." size="md" />
```

### LoadingSkeleton

Animated placeholder for content.

```tsx
<LoadingSkeleton className="h-8 w-full" />
```

### LoadingCard / LoadingTable

Pre-built loading states for common patterns.

```tsx
<LoadingCard />
<LoadingTable rows={5} />
```

## Empty States

### EmptyState

Generic empty state with icon, title, and action.

```tsx
<EmptyState
  icon={Inbox}
  title="No items"
  description="Get started by creating your first item."
  action={{ label: "Create", onClick: handleCreate }}
/>
```

### EmptySearchState / EmptyTableState

Pre-built empty states for common scenarios.

```tsx
<EmptySearchState query="test" />
<EmptyTableState entity="client" onCreate={handleCreate} />
```

## Dark Mode

Dark mode is implemented using the `.theme-dark` class on the root element.

```tsx
// Toggle dark mode
document.documentElement.classList.toggle('theme-dark');
```

All components automatically adapt to dark mode using CSS custom properties.

## Accessibility

- All interactive elements have focus states
- ARIA labels are provided where needed
- Keyboard navigation is fully supported
- Color contrast meets WCAG AA standards
- Reduced motion preferences are respected

## Icons

Use Lucide React icons throughout the application:

```tsx
import { Mail, User, Settings } from 'lucide-react';

<Mail className="h-5 w-5" />
```

## Utilities

### `cn()` - Class Name Merger

Combines and deduplicates Tailwind classes.

```tsx
import { cn } from '@/lib/utils';

<div className={cn('base-class', isActive && 'active-class', className)} />
```

### Other Utilities

- `formatCurrency()` - Format numbers as currency
- `formatDate()` - Format dates
- `formatRelativeTime()` - Relative time strings
- `truncate()` - Truncate text with ellipsis
- `debounce()` - Debounce function calls
- `generateId()` - Generate unique IDs

## Best Practices

1. **Consistency**: Use design tokens instead of hardcoded values
2. **Accessibility**: Always include proper ARIA labels and keyboard support
3. **Performance**: Prefer CSS transitions over JavaScript animations
4. **Responsiveness**: Design mobile-first, enhance for larger screens
5. **Maintainability**: Use semantic component names and clear prop types
6. **Testing**: Test components in both light and dark modes

## File Structure

```
/components
  /ui              # Base UI components
    button.tsx
    card.tsx
    input.tsx
    select.tsx
    table.tsx
    dialog.tsx
    form.tsx
    loading-state.tsx
    empty-state.tsx
  /portal
    /layout        # Layout components
      Header.tsx
      Sidebar.tsx
      PortalLayout.tsx

/styles
  leora-tokens.css # Design tokens

/lib
  utils.ts         # Utility functions

/app
  globals.css      # Global styles

tailwind.config.ts # Tailwind configuration
```

## Resources

- Tailwind CSS: https://tailwindcss.com
- Lucide Icons: https://lucide.dev
- Inter Font: https://rsms.me/inter
