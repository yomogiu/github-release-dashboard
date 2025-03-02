# GitHub Release Dashboard Style Guide & Commands

## Commands
- `npm start` - Run development server at localhost:3000
- `npm test` - Run all tests
- `npm test -- --testPathPattern=SomeComponent` - Run specific test
- `npm build` - Create production build
- `npm run lint` - Run ESLint (add with `npm i eslint --save-dev`)

## Code Style
- **Imports**: Group by type (React, MUI, contexts, components) with blank line between groups
- **Components**: Use functional components with hooks (useState, useEffect, useMemo)
- **State**: Use contexts for global state, useState for component state
- **Formatting**: 2-space indentation, 80-char line length
- **Naming**:
  - CamelCase for variables/functions, PascalCase for components
  - Use descriptive names (getIssueType vs. getType)
- **Error Handling**: 
  - Log errors with console.error
  - Always include try/catch in async functions
  - Return { success: boolean, data/error } from service calls

## Data Patterns
- Use pagination for lists (50 items default)
- Cache API responses with configurable expiry time
- Apply filters through useMemo for performance