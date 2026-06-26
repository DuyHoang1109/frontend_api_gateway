export function filterRows(rows, search) {
  const value = search.trim().toLowerCase();
  if (!value) return rows;

  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(value));
}
