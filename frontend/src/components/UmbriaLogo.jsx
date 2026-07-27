import React from 'react';

/**
 * UmbriaLogo Component
 * Renders an accurate, stylized silhouette of the Umbria region.
 */
export default function UmbriaLogo({ size = 28, className = '', color = 'var(--cypress)', accentColor = 'var(--sagrantino)' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
            aria-label="Silhouette Regione Umbria"
        >
            {/* Outline silhouette of Umbria */}
            <path
                d="M 46 6 
                   C 52 7, 56 14, 60 20 
                   C 67 24, 76 29, 79 36 
                   C 83 43, 89 50, 91 58 
                   C 93 66, 86 77, 79 85 
                   C 73 92, 60 97, 50 98 
                   C 42 98, 36 91, 31 83 
                   C 24 74, 15 65, 13 54 
                   C 11 43, 19 34, 25 28 
                   C 31 21, 38 14, 46 6 Z"
                fill={color}
                stroke={color}
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
            {/* Heart of Umbria pin indicator */}
            <path
                d="M 50 24 
                   C 54 26, 58 31, 62 36 
                   C 67 38, 73 43, 74 49 
                   C 75 56, 70 63, 65 69 
                   C 60 75, 52 80, 47 81 
                   C 41 81, 37 75, 33 69 
                   C 27 63, 21 57, 22 49 
                   C 23 42, 28 35, 33 30 
                   C 38 26, 43 24, 50 24 Z"
                fill={accentColor}
                opacity="0.9"
            />
        </svg>
    );
}
