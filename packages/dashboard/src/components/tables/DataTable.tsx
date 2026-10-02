import React from "react";

export type Column<T> = {
    header: string;
    numeric?: boolean;
    render: (row: T, index: number) => React.ReactNode;
};

type Props<T> = {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T, index: number) => string;
    emptyText?: string;
    selectedKey?: string | null;
    onRowClick?: (row: T) => void;
};

const headerClass = "px-4 py-3 text-xs font-medium text-accent-soft uppercase tracking-wider";
const cellClass = "px-4 py-3 whitespace-nowrap text-sm";

export function DataTable<T>({ columns, rows, rowKey, emptyText = "No data.", selectedKey = null, onRowClick }: Props<T>) {
    if (rows.length === 0) {
        return <p className="text-sm text-accent-soft p-6 text-center">{emptyText}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
                <thead>
                    <tr>
                        {columns.map(column => (
                            <th key={column.header} scope="col" className={`${headerClass} ${column.numeric ? 'text-right' : 'text-left'}`}>
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map((row, index) => {
                        const key = rowKey(row, index);
                        return (
                            <tr
                                key={key}
                                className={`hover:bg-accent/10 ${onRowClick ? 'cursor-pointer' : ''} ${key === selectedKey ? 'bg-[var(--variant-3)]' : ''}`}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                            >
                                {columns.map(column => (
                                    <td
                                        key={column.header}
                                        className={`${cellClass} ${column.numeric ? 'text-right tabular-nums text-accent-soft' : 'text-foreground'}`}
                                    >
                                        {column.render(row, index)}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function StatusText({ label, color }: { label: string; color: string }) {
    return <span className="text-xs font-semibold" style={{ color }}>{label}</span>;
}
