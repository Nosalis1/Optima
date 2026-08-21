import type { PropsWithChildren } from "react";
import React from "react";
import Tooltip from "../utility/tooltip";
import { QuestionMarkIcon } from '@/app/components/shared/icons';

function CardFoldableHeader({ title, timestamp, isFolded, onToggle, tooltip }: { title: string, timestamp: string, isFolded: boolean, onToggle: () => void, tooltip?: string }) {
    return (
        <div className="flex items-center justify-between mb-1 cursor-pointer p-2 border-b-1 border-accent-soft" onClick={onToggle}>
            <h2 className="text-sm font-semibold text-accent">{title}</h2>
            <p className="text-xs text-accent-soft">{timestamp}</p>
            {
                tooltip &&
                <Tooltip content={tooltip}>
                    <QuestionMarkIcon className="w-4 h-4 text-accent cursor-pointer" />
                </Tooltip>
            }
        </div>
    );
}

export type Props = {
    header?: { title: string, description?: string, tooltip?: string };
    padding?: boolean;
} & PropsWithChildren;

export function Card({ header, children, padding }: Props) {
    const [isFolded, setIsFolded] = React.useState(false);

    const handleToggle = () => {
        setIsFolded(!isFolded);
    };

    return (
        <div className={`bg-[var(--variant-1)] border border-[var(--variant-3)] rounded-md animate-fade-in`}>
            {
                header && (
                    <CardFoldableHeader
                        title={header.title}
                        timestamp={header.description || ''}
                        isFolded={isFolded}
                        onToggle={handleToggle}
                        tooltip={header.tooltip}
                    />
                )
            }
            <div className={`justify-between ${padding ? 'p-3' : ''}`}>
                {!isFolded && children}
            </div>
        </div>
    );
}

