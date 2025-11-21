import * as React from 'react';
import { ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type MultiSelectOption = {
  label: string;
  value: string;
};

type MultiSelectProps = {
  value: string[];
  onValueChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select options',
  disabled = false,
  className,
}: MultiSelectProps): JSX.Element {
  const selectedValues = React.useMemo(() => new Set(value), [value]);
  const triggerLabel =
    value.length > 0
      ? options
          .filter((option) => selectedValues.has(option.value))
          .map((option) => option.label)
          .join(', ')
      : placeholder;

  const handleToggle = (optionValue: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      const newValues = new Set(value);
      newValues.add(optionValue);
      onValueChange(Array.from(newValues));
    } else {
      onValueChange(value.filter((item) => item !== optionValue));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            'w-full justify-between font-normal',
            value.length === 0 && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 max-h-64 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedValues.has(option.value)}
            onCheckedChange={(checked) => handleToggle(option.value, checked)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
        {options.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No options available</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
