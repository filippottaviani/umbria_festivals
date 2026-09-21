# Frontend Development Booster Rules

## Visual & Design Excellence
- **Rich Aesthetics**: Avoid default browser styling and generic primary colors. Use cohesive color palettes, polished typography, balanced whitespace, and subtle micro-interactions.
- **Responsive Layouts**: Ensure UI seamlessly adapts across Mobile, Tablet, and Desktop screen widths using mobile-first CSS media queries or CSS Grid / Flexbox container queries.
- **Accessibility (a11y)**: Enforce Semantic HTML5 tags (`<nav>`, `<main>`, `<article>`, `<header>`, `<footer>`), accurate `aria-*` attributes, explicit `alt` text for images, and keyboard navigation support.

## Performance & Optimization
- **Asset Loading**: Lazy-load non-critical images and heavy dependencies.
- **Layout Shift Prevention**: Always define explicit `width` and `height` attributes or aspect ratio containers on images and media to avoid Cumulative Layout Shift (CLS).
- **Bundle & State Management**: Prefer fine-grained state updates. Keep transient component state local rather than bloating global stores.

## Modern Web Standards
- **Form Controls & Inputs**: Use native inputs (`<input type="date">`, `<input type="color">`, `<input type="number">`) before pulling in heavy third-party picker libraries.
- **Clean Component Contracts**: Export clean, type-safe interfaces for components. Keep components focused, modular, and single-responsibility.
