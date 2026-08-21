type Props = {
    title: string;
    timestamp: string;
    type: 'info' | 'advisory' | 'warning' | 'critical';
}

export function SmallAlert({ title, timestamp, type }: Props) {

    function getTypeColor(type: 'info' | 'advisory' | 'warning' | 'critical') {
        switch (type) {
            case 'info':
                return 'border-[var(--chart-6)]';
            case 'advisory':
                return 'border-[var(--chart-3)]';
            case 'warning':
                return 'border-[var(--chart-4)]';
            case 'critical':
                return 'border-[var(--chart-5)]';
            default:
                return 'border-[var(--chart-1)]';
        }
    }

    return (
        <div className={`flex flex-col items-left justify-between p-2 border-l-3 ${getTypeColor(type)} m-2`}>
            <p className="text-sm text-foreground">{title}</p>
            <p className="text-xs text-accent-soft">{timestamp} * {type}</p>
        </div>
    );
}