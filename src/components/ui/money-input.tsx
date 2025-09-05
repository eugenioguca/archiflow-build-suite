import React, { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const formatValue = (num: number) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
      }).format(num);
    };

    const parseValue = (str: string): number => {
      // Remove currency symbols and parse as number
      const cleaned = str.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseValue(e.target.value);
      onChange(newValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Reformat on blur
      e.target.value = formatValue(value);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Show raw number on focus for easier editing
      e.target.value = value.toString();
      e.target.select();
    };

    return (
      <Input
        ref={ref}
        {...props}
        className={cn("text-right", className)}
        defaultValue={formatValue(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="$ 0.00"
      />
    );
  }
);

MoneyInput.displayName = "MoneyInput";