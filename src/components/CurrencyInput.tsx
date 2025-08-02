import { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onBlur, className, placeholder = "$ 0.00", ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    const formatCurrency = (amount: number) => {
      if (amount === 0) return "";
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
      }).format(amount);
    };

    const parseValue = (str: string): number => {
      // Remove all non-numeric characters except dots and commas
      const cleanStr = str.replace(/[^\d.,]/g, '');
      // Replace comma with dot for decimal parsing
      const normalizedStr = cleanStr.replace(',', '.');
      const parsed = parseFloat(normalizedStr);
      return isNaN(parsed) ? 0 : parsed;
    };

    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value === 0 ? "" : formatCurrency(value));
      }
    }, [value, isFocused]);

    const handleFocus = () => {
      setIsFocused(true);
      setDisplayValue(value === 0 ? "" : value.toString());
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const numericValue = parseValue(displayValue);
      onChange(numericValue);
      setDisplayValue(numericValue === 0 ? "" : formatCurrency(numericValue));
      
      if (onBlur) {
        onBlur(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setDisplayValue(newValue);
      
      // Update the value in real-time during focus for calculations
      if (isFocused) {
        const numericValue = parseValue(newValue);
        onChange(numericValue);
      }
    };

    return (
      <Input
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn("text-right", className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";