
interface TableProps {
    titles: string[];
    data?: any[];
    onRowRender?: (row: any, idx: number) => React.ReactNode;
    onHeaderClick?: (header: string) => void;
}

export function Table({ titles, data, onRowRender, onHeaderClick, children }: TableProps & React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-950 text-gray-400 text-xs font-semibold uppercase border-b border-gray-800">
                        {titles.map((title, idx) => (
                            <th key={idx} className="px-6 py-3" onClick={() => onHeaderClick?.(title)}>{title}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                    {data?.map((row, idx) => (
                        onRowRender ? onRowRender(row, idx) : <></>
                    ))}
                </tbody>
            </table>
            {children}
        </div>
    )
};