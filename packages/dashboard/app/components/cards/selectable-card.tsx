import type { PropsWithChildren } from "react";
import { CardFoldableHeader } from "./card";

type Props = {
    header?: { title: string, description?: string, tooltip?: string };
    padding?: boolean;
    onClick?: () => void;
    isSelected?: boolean;
} & PropsWithChildren;

export function SelectableCard({ children, header, padding, onClick, isSelected = false }: Props) {
    return (
        <div className={`bg-[var(--variant-1)] border border-[var(--variant-3)] rounded-md animate-fade-in ${isSelected ? 'border-[var(--variant-4)]' : ''} ${onClick ? 'cursor-pointer hover:bg-[var(--variant-2)]' : ''}`} onClick={onClick}>
            {
                header && (
                    <CardFoldableHeader
                        title={header.title}
                        timestamp={header.description || ''}
                        isFolded={false}
                        onToggle={() => { }}
                        tooltip={header.tooltip}
                    />
                )
            }
            <div className={`justify-between ${padding ? 'p-3' : ''}`}>
                {children}
            </div>
        </div>
    );
}