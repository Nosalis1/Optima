import { useSize } from './utility/useSize';

type Point = {
    x: number;
    y: number;
}

type Entry = {
    points: Point[];
    color?: string;
    type?: 'solid' | 'dashed';
    fillArea?: boolean;
}

type Props = { data: Entry; }

function getMaxValue(points: Point[]): number {
    const max = Math.max(...points.map(p => p.y));
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

    const normalizedData = data.points.map(point => ({
        x: point.x,
        y: ((point.y - lowerBound) / (upperBound - lowerBound)) * 0.5
    }));

    const points = normalizedData.map((point, index) => {
        const x = (index / (normalizedData.length - 1)) * chartWidth;
        const y = chartHeight - point.y * chartHeight;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div ref={ref} className={`w-full h-16 rounded-md`} id={"line-showcase"}>
            {
                isHydrated && (
                    <svg className="w-full h-full">
                        <polyline
                            fill="none"
                            stroke={data.color}
                            strokeWidth="2"
                            points={points}
                        />
                    </svg>
                )
            }
        </div>
    );
}   