"use client";
import React from 'react';

export function useSize<T extends HTMLElement = HTMLDivElement>(defaultWidth: number = 40, defaultHeight: number = 80) {
    const ref = React.useRef<T | null>(null);
    const [dimensions, setDimensions] = React.useState({ width: defaultWidth, height: defaultHeight });
    const [isHydrated, setIsHydrated] = React.useState(false);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;

        let frame: number | undefined;
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

        setIsHydrated(true);
        window.addEventListener('resize', updateDimensions);

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(updateDimensions);
            resizeObserver.observe(el);
        }

        frame = window.requestAnimationFrame(updateDimensions);

        return () => {
            window.removeEventListener('resize', updateDimensions);
            resizeObserver?.disconnect();
            if (frame) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, []);

    return {
        ...dimensions,
        isHydrated,
        ref
    };
}