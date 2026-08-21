"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
    children: React.ReactElement<React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }>;
    content: string;
}

export default function Tooltip({ children, content }: TooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, arrowX: "50%" });
    const [mounted, setMounted] = useState(false);

    const triggerRef = useRef<HTMLElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const updatePosition = () => {
        if (!triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();

        const triggerCenter = triggerRect.left + triggerRect.width / 2;

        const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 200;
        const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 44;
        const padding = 12;

        let optimalLeft = triggerCenter - tooltipWidth / 2;

        if (optimalLeft < padding) {
            optimalLeft = padding;
        } else if (optimalLeft + tooltipWidth > window.innerWidth - padding) {
            optimalLeft = window.innerWidth - tooltipWidth - padding;
        }

        const relativeArrowX = triggerCenter - optimalLeft;

        setCoords({
            top: triggerRect.top + window.scrollY - tooltipHeight - 8,
            bottom: triggerRect.bottom + window.scrollY + 8,
            left: optimalLeft + window.scrollX,
            arrowX: `${relativeArrowX}px`,
        });
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            const timeout = setTimeout(updatePosition, 0);

            window.addEventListener("scroll", updatePosition);
            window.addEventListener("resize", updatePosition);

            return () => {
                clearTimeout(timeout);
                window.removeEventListener("scroll", updatePosition);
                window.removeEventListener("resize", updatePosition);
            };
        }
    }, [isOpen]);

    const handleMouseEnter = () => setIsOpen(true);
    const handleMouseLeave = () => setIsOpen(false);

    return (
        <>
            {React.cloneElement(children, {
                ref: (node: HTMLElement | null) => {
                    triggerRef.current = node;
                    const { ref } = children as any;
                    if (typeof ref === "function") ref(node);
                    else if (ref) ref.current = node;
                },
                onMouseEnter: handleMouseEnter,
                onMouseLeave: handleMouseLeave,
                onFocus: handleMouseEnter,
                onBlur: handleMouseLeave,
            })}

            {isOpen && mounted && createPortal(
                <div
                    ref={tooltipRef}
                    style={{
                        position: "absolute",
                        top: `${coords.bottom}px`,
                        left: `${coords.left}px`,
                    }}
                    className="z-[9999] pointer-events-none bg-black text-white text-xs px-3 py-2 rounded shadow-xl max-w-[220px] break-words text-center leading-relaxed"
                >
                    <div
                        style={{ left: coords.arrowX }}
                        className="absolute bottom-full -translate-x-1/2 w-2 h-2 rotate-45 bg-black -mb-1"
                    />
                    {content}
                </div>,
                document.body
            )}
        </>
    );
}

