export default function DataTable({ columns, rows, emptyLabel = 'No records found' }) {
  return (
    <div className="card overflow-hidden">
      {/*
        Tables keep their natural width on small screens and scroll sideways
        inside the card rather than squashing columns into unreadable slivers.
      */}
      <div className="overflow-x-auto">
        <table className="table-shell min-w-[34rem]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-ink-400">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id ?? index}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
