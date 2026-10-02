"use client";
import React from 'react';

type Dimensions = { width: number; height: number };

export function useSize<T extends HTMLElement = HTMLDivElement>(defaultWidth: number = 40, defaultHeight: number = 80) {
    const [element, setElement] = React.useState<T | null>(null);
    const ref = React.useCallback((node: T | null) => setElement(node), []);
    const [measured, setMeasured] = React.useState<Dimensions | null>(null);

    React.useLayoutEffect(() => {
        const el = element;
        if (!el) return;

        let resizeObserver: ResizeObserver | undefined;

        const updateDimensions = () => {
            const rect = el.getBoundingClientRect();
            const width = Math.round(rect.width);
            const height = Math.round(rect.height);
            if (width === 0 || height === 0) return;

            setMeasured((current) => {
                if (current && current.width === width && current.height === height) {
                    return current;
                }
                return { width, height };
            });
        }

        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(updateDimensions);
            resizeObserver.observe(el);
        }

        return () => {
            window.removeEventListener('resize', updateDimensions);
            resizeObserver?.disconnect();
        };
    }, [element]);

    return {
        width: measured?.width ?? defaultWidth,
        height: measured?.height ?? defaultHeight,
        isHydrated: measured !== null,
        ref
    };
}
