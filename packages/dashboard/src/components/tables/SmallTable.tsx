export function SmallTable({ columns, data }: { columns: string[], data: any[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
                <thead>
                    <tr>
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-accent-soft uppercase tracking-wider"
                            >
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {columns.map((column, colIndex) => (
                                <td
                                    key={colIndex}
                                    className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft"
                                >
                                    {row[column]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}