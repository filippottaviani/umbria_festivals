import React from 'react';

/**
 * UmbriaLogo Component
 * Renders the official Umbria olive branch emblem.
 * Supports standard full-color mode and negative (white/monochrome silhouette) mode.
 */
export default function UmbriaLogo({
    size = 28,
    className = '',
    negative = false,
    alt = 'Sagra Umbra — Logo',
    style = {}
}) {
    const src = negative ? '/icon-white.svg' : '/icon.svg';

    return (
        <img
            src={src}
            alt={alt}
            width={size}
            height={size}
            className={`umbria-brand-logo ${negative ? 'negative' : ''} ${className}`.trim()}
            style={{
                width: size,
                height: size,
                objectFit: 'contain',
                display: 'inline-block',
                verticalAlign: 'middle',
                flexShrink: 0,
                ...(negative ? { filter: 'brightness(0) invert(1)' } : {}),
                ...style
            }}
            loading="eager"
            decoding="async"
        />
    );
}
