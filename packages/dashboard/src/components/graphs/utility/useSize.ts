"use client";
import React from 'react';

export function useSize<T extends HTMLElement = HTMLDivElement>(defaultWidth: number = 40, defaultHeight: number = 80) {
    const [element, setElement] = React.useState<T | null>(null);
    const ref = React.useCallback((node: T | null) => setElement(node), []);
    const [dimensions, setDimensions] = React.useState({ width: defaultWidth, height: defaultHeight });

    React.useEffect(() => {
        const el = element;
        if (!el) return;

        let resizeObserver: ResizeObserver | undefined;

        const updateDimensions = () => {
            const width = Math.round(el.getBoundingClientRect().width);
            const height = Math.round(el.getBoundingClientRect().height);

            setDimensions((current) => {
                if (current.width === width && current.height === height) {
                    return current;
                }
                return { width, height };
            });
        }

        window.addEventListener('resize', updateDimensions);

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(updateDimensions);
            resizeObserver.observe(el);
        }

        const frame = window.requestAnimationFrame(updateDimensions);

        return () => {
            window.removeEventListener('resize', updateDimensions);
            resizeObserver?.disconnect();
            window.cancelAnimationFrame(frame);
        };
    }, [element]);

    return {
        ...dimensions,
        isHydrated: element !== null,
        ref
    };
}