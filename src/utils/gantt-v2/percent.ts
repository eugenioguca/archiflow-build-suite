export const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const calculatePercent = (amount: number, total: number): number => {
  if (total === 0) return 0;
  return (amount / total) * 100;
};

export const parsePercent = (value: string): number => {
  const cleaned = value.replace('%', '');
  return parseFloat(cleaned) || 0;
};