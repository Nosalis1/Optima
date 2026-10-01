import { useSize } from './utility/useSize';

type Point = {
    x: number;
    y: number | null;
}

type Entry = {
    points: Point[];
    color?: string;
    type?: 'solid' | 'dashed';
    fillArea?: boolean;
}

type Props = { data: Entry; }

function getMaxValue(points: Point[]): number {
    const max = Math.max(0, ...points.flatMap(p => p.y === null ? [] : [p.y]));
    return max === 0 ? 1 : max; // Avoid division by zero
}

export default function LineShowcase({
    data
}: Props) {
    const { width: chartWidth, height: chartHeight, isHydrated, ref } = useSize();

    const minValue = 0;
    const maxValue = getMaxValue(data.points);

    const upperBound = maxValue + (maxValue - minValue) * 0.1;
    const lowerBound = minValue - (maxValue - minValue) * 0.1;

    const xs = data.points.map(p => p.x);
    const minX = Math.min(...xs);
    const xRange = (Math.max(...xs) - minX) || 1;

    const segments: string[] = [];
    let current: string[] = [];
    for (const point of data.points) {
        if (point.y === null) {
            if (current.length) segments.push(current.join(' '));
            current = [];
            continue;
        }
        const x = ((point.x - minX) / xRange) * chartWidth;
        const y = chartHeight - ((point.y - lowerBound) / (upperBound - lowerBound)) * 0.5 * chartHeight;
        current.push(`${x},${y}`);
    }
    if (current.length) segments.push(current.join(' '));

    return (
        <div ref={ref} className={`w-full h-16 rounded-md`} id={"line-showcase"}>
            {
                isHydrated && (
                    <svg className="w-full h-full">
                        {segments.map((points, i) => (
                            <polyline
                                key={i}
                                fill="none"
                                stroke={data.color}
                                strokeWidth="2"
                                points={points}
                            />
                        ))}
                    </svg>
                )
            }
        </div>
    );
}   