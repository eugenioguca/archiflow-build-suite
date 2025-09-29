/**
 * Utilities for SearchableCombobox components
 */

export type SearchableComboboxItem = {
  value: string;
  label: string;
  codigo?: string;
  searchText: string;
};

/**
 * Normalize data rows to SearchableComboboxItem format
 * Adds visual codigo (fallback to first 8 chars of ID) and searchText
 */
export const toItems = (
  rows: Array<{ id: string; nombre?: string; full_name?: string; project_name?: string; codigo?: string }>
): SearchableComboboxItem[] => {
  return rows.map((r) => {
    const codigo = r.codigo || r.id.slice(0, 8);
    const label = r.nombre || r.full_name || r.project_name || '';
    return {
      value: r.id,
      label,
      codigo,
      searchText: `${codigo} ${label}`.toLowerCase(),
    };
  });
};
