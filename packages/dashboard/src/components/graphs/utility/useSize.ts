"use client";
import React from 'react';

export function useSize(id: string = "graph-root", defaultWidth: number = 40, defaultHeight: number = 80) {
    const [dimensions, setDimensions] = React.useState({ width: defaultWidth, height: defaultHeight });
    const [isHydrated, setIsHydrated] = React.useState(false);

    React.useEffect(() => {
        let frame: number | undefined;
        let resizeObserver: ResizeObserver | undefined;

        const updateDimensions = () => {
            const chartContainer = document.getElementById(id);
            if (!chartContainer) return;

            const width = Math.round(chartContainer.getBoundingClientRect().width);
            const height = Math.round(chartContainer.getBoundingClientRect().height);

            setDimensions((current) => {
                if (current.width === width && current.height === height) {
                    return current;
                }
                return { width, height };
            });
        }

        setIsHydrated(true);
        window.addEventListener('resize', updateDimensions);

        const chartContainer = document.getElementById(id);
        if (typeof ResizeObserver !== 'undefined' && chartContainer) {
            resizeObserver = new ResizeObserver(updateDimensions);
            resizeObserver.observe(chartContainer);
        }

        frame = window.requestAnimationFrame(updateDimensions);

        return () => {
            window.removeEventListener('resize', updateDimensions);
            resizeObserver?.disconnect();
            if (frame) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, [id]);

    return {
        ...dimensions,
        isHydrated
    }
}