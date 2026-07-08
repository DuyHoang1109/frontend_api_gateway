export function filterRows(rows, search) {
  const value = search.trim().toLowerCase();
  if (!value) return rows;

  return rows.filter((row) => {
    const searchable = [
      JSON.stringify(row),
      row.host && row.port ? `${row.host}:${row.port}` : '',
      row.method && row.path ? `${row.method} ${row.path}` : ''
    ].join(' ').toLowerCase();

    return searchable.includes(value);
  });
}
