/**
 * AutoResizeTextarea - Textarea con crecimiento automático vertical
 * Crece hasta maxRows, luego aparece scroll vertical
 */
import { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxRows?: number; // Máximo de líneas antes de scroll (default: 12)
  minRows?: number; // Mínimo de líneas (default: 3)
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, maxRows = 12, minRows = 3, onChange, value, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    
    // Expose internal ref to parent via forwarded ref
    useImperativeHandle(ref, () => internalRef.current!);

    const adjustHeight = () => {
      const textarea = internalRef.current;
      if (!textarea) return;

      // Reset height para recalcular
      textarea.style.height = 'auto';

      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;

      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

      textarea.style.height = `${newHeight}px`;
      
      // Si alcanzamos maxHeight, activar overflow
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    };

    // Ajustar altura cuando cambia el valor
    useEffect(() => {
      adjustHeight();
    }, [value]);

    // Ajustar en mount
    useEffect(() => {
      adjustHeight();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onChange?.(e);
    };

    return (
      <Textarea
        ref={internalRef}
        className={cn(
          'resize-none transition-[height] duration-100 min-w-0 whitespace-pre-wrap break-words overflow-hidden',
          className
        )}
        onChange={handleChange}
        value={value}
        {...props}
      />
    );
  }
);

AutoResizeTextarea.displayName = 'AutoResizeTextarea';
