import { useState, useCallback } from 'react';
import { z } from 'zod';

/**
 * Custom hook for enhanced form validation with real-time feedback
 * Provides comprehensive validation state management and error handling
 */
export function useFormValidation<T extends z.ZodSchema>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = useCallback(async (
    fieldName: string, 
    value: any, 
    allValues?: Record<string, any>
  ) => {
    setIsValidating(true);
    try {
      // For single field validation, create a partial schema
      const result = await schema.safeParseAsync(allValues || { [fieldName]: value });
      
      if (!result.success) {
        const fieldError = result.error.errors.find(err => 
          err.path.includes(fieldName)
        );
        
        if (fieldError) {
          setErrors(prev => ({
            ...prev,
            [fieldName]: fieldError.message
          }));
          return false;
        }
      }
      
      // Clear error if validation passes
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      setErrors(prev => ({
        ...prev,
        [fieldName]: 'Error de validación'
      }));
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [schema]);

  const validateForm = useCallback(async (values: Record<string, any>) => {
    setIsValidating(true);
    try {
      const result = await schema.safeParseAsync(values);
      
      if (!result.success) {
        const newErrors: Record<string, string> = {};
        result.error.errors.forEach(err => {
          if (err.path.length > 0) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
        return { success: false, errors: newErrors };
      }
      
      setErrors({});
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Form validation error:', error);
      const generalError = { general: 'Error de validación del formulario' };
      setErrors(generalError);
      return { success: false, errors: generalError };
    } finally {
      setIsValidating(false);
    }
  }, [schema]);

  const setFieldTouched = useCallback((fieldName: string, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: isTouched
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const hasError = useCallback((fieldName: string) => {
    return touched[fieldName] && !!errors[fieldName];
  }, [errors, touched]);

  const getFieldError = useCallback((fieldName: string) => {
    return hasError(fieldName) ? errors[fieldName] : undefined;
  }, [errors, hasError]);

  return {
    errors,
    touched,
    isValidating,
    validateField,
    validateForm,
    setFieldTouched,
    clearErrors,
    hasError,
    getFieldError,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Common validation schemas for reuse across the application
 */
export const commonValidationSchemas = {
  email: z.string().email("Email inválido").max(255, "Email muy largo"),
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, "Teléfono inválido")
    .min(10, "Teléfono debe tener al menos 10 dígitos"),
  currency: z.number()
    .min(0, "Monto no puede ser negativo")
    .max(999999999.99, "Monto excede el límite máximo")
    .transform(val => Number(val.toFixed(2))),
  uuid: z.string().uuid("ID inválido"),
  nonEmptyString: (fieldName: string) => z.string()
    .min(1, `${fieldName} es requerido`)
    .trim(),
  dateRange: (startDate?: Date, endDate?: Date) => z.date()
    .min(startDate || new Date('2020-01-01'), "Fecha muy antigua")
    .max(endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "Fecha muy lejana"),
  percentage: z.number()
    .min(0, "Porcentaje no puede ser negativo")
    .max(100, "Porcentaje no puede exceder 100%"),
  positiveInteger: z.number()
    .int("Debe ser un número entero")
    .min(1, "Debe ser mayor a 0")
};