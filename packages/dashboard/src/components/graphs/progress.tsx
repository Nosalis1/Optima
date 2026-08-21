
type Entry = {
    label: string;
    value: number;
    color?: string;
}

type Props = {
    data: Entry[];
    maxValue?: number;
    color?: string;
}

export default function ProgressGraph({
    data,
    maxValue,
    color = 'var(--chart-6)',
}: Props) {
    if (!data || data.length === 0 || data.every((series) => series.value === 0)) {
        return null;
    }

    const computedMaxValue = maxValue ?? data.reduce((sum, entry) => sum + entry.value, 0);

    return (
        <div className="w-full bg-[var(--variant-3)] rounded-full h-[10px] flex overflow-hidden">
            {data.map((entry, index) => {
                const percentage = (entry.value / computedMaxValue) * 100;

                if (percentage <= 0) return null;

                return (
                    <div
                        key={index}
                        className="h-full transition-all duration-500 ease-in-out"
                        style={{
                            width: `${percentage}%`,
                            backgroundColor: entry.color || color,
                        }}
                        title={`${entry.label}: ${entry.value}`}
                    />
                );
            })}
        </div>
    )
}