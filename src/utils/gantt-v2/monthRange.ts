export const generateMonthRange = (startYYYYMM: string, months: number) =>
  Array.from({ length: months }, (_, i) => {
    let n = parseInt(startYYYYMM, 10);
    let y = Math.floor(n / 100), m = n % 100;
    m += i; 
    y += Math.floor((m - 1) / 12); 
    m = ((m - 1) % 12) + 1;
    
    const value = String(y * 100 + m).padStart(6, '0');
    const label = new Date(y, m - 1, 1).toLocaleDateString('es-MX', { 
      month: 'short', 
      year: 'numeric' 
    });
    return { value, label }; // label p.ej. "sep 2025"
  });

// Get current month in YYYYMM format
export const getCurrentMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
};