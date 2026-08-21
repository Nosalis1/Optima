import React from 'react';

interface OptimaIconProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
    color?: string;
}

export const OptimaGaugeIcon: React.FC<OptimaIconProps> = ({
    size = 64,
    color = '#FFFFFF',
    className = '',
    ...props
}) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <circle
                cx="100"
                cy="100"
                r="75"
                stroke={color}
                strokeWidth="7"
                strokeOpacity="0.25"
            />

            <path
                d="M 45 135 A 65 65 0 1 1 155 135"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
            />

            <circle cx="50" cy="130" r="4" fill={color} />
            <circle cx="100" cy="42" r="4" fill={color} />
            <circle cx="150" cy="130" r="4" fill={color} />

            <rect x="78" y="130" width="7" height="18" rx="3.5" fill={color} fillOpacity="0.5" />
            <rect x="92" y="118" width="7" height="30" rx="3.5" fill={color} fillOpacity="0.9" />
            <rect x="106" y="124" width="7" height="24" rx="3.5" fill={color} fillOpacity="0.6" />

            <path
                d="M 100 100 L 132 68"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="8" fill={color} />
        </svg>
    );
};

export default OptimaGaugeIcon;