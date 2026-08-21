import React from "react";
import { Card, Props as CardProps } from "./card";
import Tooltip from "../utility/tooltip";
import { QuestionMarkIcon } from "../shared/icons";

type HeroProps = {
    header?: CardProps['header']
} & React.PropsWithChildren;

export function Hero({
    children,
    header = undefined,
}: HeroProps) {
    return (
        <Card header={header} padding>
            {children}
        </Card>
    );
}

type HeroHeaderProps = {
    title: string,
    value: number | string,
    unit?: string,
    color?: string,
    tooltip?: string
};

export function HeroHeader({
    title,
    value,
    unit = '',
    color = 'accent',
    tooltip = undefined
}: HeroHeaderProps) {
    const val = typeof value === 'number' ? value.toFixed(2) : value;
    return (
        <>
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-accent">{title}</h2>
                {tooltip && (
                    <Tooltip content={tooltip}>
                        <QuestionMarkIcon className="w-4 h-4 text-accent cursor-pointer" />
                    </Tooltip>
                )}
            </div>
            <p className={`text-2xl font-bold`} style={color ? { color: color } : undefined}
            >{val}{unit && <span className="text-sm text-gray-400"> {unit}</span>}</p>
        </>
    );
}

type HeroContentProps = {
    variant?: 'default' | 'accent';
    values: Record<string, string>;
};

export function HeroContent({
    variant = 'default',
    values
}: HeroContentProps) {
    if (variant === 'default') {
        return (
            <div className="mt-2 mb-2 space-y-1">
                {
                    values && Object.entries(values).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-sm text-accent-soft">
                            <p className="text-sm text-accent-soft">{key}:</p>
                            <span>{val}</span>
                        </div>
                    ))
                }
            </div>
        );
    }
    return (
        <>
            {
                values && Object.entries(values).map(([key, val]) => (
                    <div key={key} className="flex flex-row justify-between h-full">
                        <span className="text-[10px] text-foreground uppercase tracking-wider font-semibold block mb-1">
                            {key}
                        </span>
                        <span className="text-[10px] text-foreground-soft uppercase tracking-wider font-semibold block mb-1 ml-2">
                            {val}
                        </span>
                    </div>
                ))
            }
        </>
    )
}