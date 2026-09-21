# Modern Web Framework Rules

## React & Modern Component Frameworks
- **Functional Components & Hooks**: Write clean functional components with modern React / Vue composition patterns.
- **State Hygiene**: Avoid prop drilling. Keep local UI state close to where it is used; use Context or state managers only for genuine global application state.
- **Strict Typing**: Use strict TypeScript interfaces/types for component props, events, and API data schemas.

## Async & API Communications
- **Clean Fetching**: Handle loading, error, and empty states explicitly.
- **REST & OpenAPI**: Align frontend API calls with clean RESTful endpoints and FastAPI/Express backend contracts.
- **Error Boundaries**: Wrap major UI sections in error boundaries to prevent full-page crashes.

## CSS & Styling Architecture
- **Modern Layouts**: Flexbox and CSS Grid for layout structure.
- **Vanilla / Utility CSS**: Follow clean class naming or modern utility conventions. Avoid inline styles for non-dynamic properties.
