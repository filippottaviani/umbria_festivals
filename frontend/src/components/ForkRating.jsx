import React, { useState } from 'react';

/**
 * Single SVG 3-Tine Fork Icon Component (Forchetta a 3 punte)
 */
export function ForkIcon({ fillPercent = 100, size = 20, activeColor = '#D97706', emptyColor = '#E5E7EB' }) {
    const gradientId = React.useId();

    // 3-Tine Fork Path: symmetric 3 tines (left, center, right), curved base, stem
    const forkPath = "M7 2v7c0 1.66 1.34 3 3 3v9h4v-9c1.66 0 3-1.34 3-3V2h-2v6h-2V2h-2v6H9V2H7z";

    if (fillPercent >= 100) {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                style={{ display: 'inline-block', flexShrink: 0 }}
            >
                <path d={forkPath} fill={activeColor} />
            </svg>
        );
    }

    if (fillPercent <= 0) {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                style={{ display: 'inline-block', flexShrink: 0 }}
            >
                <path d={forkPath} fill={emptyColor} />
            </svg>
        );
    }

    // Partial fill
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            style={{ display: 'inline-block', flexShrink: 0 }}
        >
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset={`${fillPercent}%`} stopColor={activeColor} />
                    <stop offset={`${fillPercent}%`} stopColor={emptyColor} />
                </linearGradient>
            </defs>
            <path d={forkPath} fill={`url(#${gradientId})`} />
        </svg>
    );
}

/**
 * ForkRating Component
 * Displays 1..5 three-tine forks with interactive picking or read-only view.
 */
export default function ForkRating({
    rating = 0,
    maxRating = 5,
    size = 20,
    interactive = false,
    onRatingChange,
    showScore = false,
    activeColor = 'var(--fork-active, #D97706)',
    emptyColor = 'var(--fork-empty, #E2E8F0)'
}) {
    const [hoverRating, setHoverRating] = useState(0);

    const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

    const handleMouseEnter = (index) => {
        if (interactive) setHoverRating(index);
    };

    const handleMouseLeave = () => {
        if (interactive) setHoverRating(0);
    };

    const handleClick = (index) => {
        if (interactive && onRatingChange) {
            onRatingChange(index);
        }
    };

    return (
        <div
            className={`fork-rating-container ${interactive ? 'interactive' : ''}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: interactive ? '6px' : '3px',
                userSelect: 'none',
                cursor: interactive ? 'pointer' : 'default'
            }}
            onMouseLeave={handleMouseLeave}
        >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: interactive ? '6px' : '3px' }}>
                {Array.from({ length: maxRating }, (_, i) => {
                    const forkIndex = i + 1;
                    let fillPercent = 0;

                    if (displayRating >= forkIndex) {
                        fillPercent = 100;
                    } else if (displayRating > i && displayRating < forkIndex) {
                        fillPercent = Math.round((displayRating - i) * 100);
                    }

                    return (
                        <span
                            key={forkIndex}
                            className={`fork-item ${interactive ? 'interactive-fork' : ''}`}
                            onMouseEnter={() => handleMouseEnter(forkIndex)}
                            onClick={() => handleClick(forkIndex)}
                            style={{
                                transition: 'transform 0.15s ease',
                                transform: interactive && hoverRating >= forkIndex ? 'scale(1.25)' : 'scale(1)'
                            }}
                            title={interactive ? `${forkIndex} ${forkIndex === 1 ? 'forchetta' : 'forchette'}` : undefined}
                        >
                            <ForkIcon
                                fillPercent={fillPercent}
                                size={size}
                                activeColor={activeColor}
                                emptyColor={emptyColor}
                            />
                        </span>
                    );
                })}
            </div>

            {showScore && rating > 0 && (
                <span
                    className="fork-rating-score"
                    style={{
                        marginLeft: '0.35rem',
                        fontWeight: 700,
                        fontSize: `${Math.max(13, size * 0.75)}px`,
                        color: 'var(--antracite, #1E293B)'
                    }}
                >
                    {Number(rating).toFixed(1)}
                </span>
            )}
        </div>
    );
}
