# AI Agent Prompt for React+JS Development

## Project Context
You are assisting with a React+JS project that uses Firestore as its database. Your task is to provide high-quality, production-ready code that follows React and JavaScript best practices.

## Core Requirements
1. **Use Existing Components**: Utilize existing components when possible rather than creating new ones unnecessarily.
2. **Backend Processing**: All calculations and data processing should be performed in the backend, not in the frontend.
3. **Database Structure**: All Firestore database calls should be placed in the appropriate designated folders following the project structure.

## React Development Guidelines

### Component Design
- Follow the single responsibility principle - each component should do one thing and do it well
- Keep components small and focused (<250 lines as a guideline)
- Use functional components with hooks rather than class components
- Implement proper prop validation using PropTypes or TypeScript interfaces
- Use React.memo() for performance optimization only when necessary and after testing

### State Management
- Use local state (useState) for component-specific state
- Implement context API for state that needs to be shared across multiple components
- Consider using useReducer for complex state logic
- Avoid prop drilling by using context or state management libraries where appropriate

### Hooks Usage
- Always follow the Rules of Hooks:
  - Only call hooks at the top level of your component
  - Only call hooks from React functions (not regular JavaScript functions)
- Create custom hooks to extract and reuse stateful logic between components
- Keep effects focused and separate concerns into different useEffect calls
- Properly handle cleanup functions in useEffect to prevent memory leaks

### Performance Optimization
- Use React.lazy() and Suspense for code-splitting
- Implement useMemo and useCallback to prevent unnecessary re-renders, but only when performance testing indicates a need
- Avoid inline function definitions in render where they could cause unnecessary re-renders
- Use proper key props when rendering lists (avoid using array index as keys)

## JavaScript Best Practices

### Code Structure
- Use ES6+ features appropriately (arrow functions, destructuring, spread operator, etc.)
- Implement proper error handling with try/catch blocks
- Use async/await for asynchronous operations rather than nested promises
- Avoid callback hell through proper Promise chaining or async/await

### Variables and Functions
- Use const by default, let when needed, and never use var
- Follow proper naming conventions (camelCase for variables and functions, PascalCase for components)
- Keep functions pure when possible (same input always produces same output with no side effects)
- Implement function parameters with default values where appropriate

### Code Quality
- Use optional chaining (?.) and nullish coalescing operators (??) to handle undefined/null values gracefully
- Implement early returns to avoid deeply nested if statements
- Use template literals for string concatenation
- Avoid magic numbers/strings - use named constants

## Firestore Integration

### Database Operations
- Create separate service files for Firestore operations in the designated database folder
- Implement proper error handling for all database operations
- Use batch writes for related operations that should succeed or fail together
- Structure queries to minimize reads and optimize performance

### User Identification and Data Retrieval
- User collections are stored by government ID, not by Firebase authentication UID
- When a new auth user is created, find the original user from collections by their email address
- Always use email as the lookup key for user data instead of auth UID when retrieving user information
- Implement helper functions to abstract this lookup process for consistency across the application
- Cache user reference data where appropriate to minimize redundant database calls

### Security
- Never store sensitive information in client-side code
- Implement proper Firestore security rules on the backend
- Use Firebase Authentication appropriately when handling user data
- Validate input on both client and server sides

## Project Structure Guidelines
- Follow the established folder structure of the project
- Place Firestore service calls in the designated database/services folder
- Keep related files together (component, styles, tests)
- Use absolute imports rather than relative imports when appropriate

## Delivery Format
When providing code solutions:
1. Include comments explaining complex logic
2. Provide complete, working solutions rather than snippets when possible
3. Show integration with existing project structure
4. Highlight any performance considerations or potential edge cases
5. When suggesting alternative approaches, clearly explain the tradeoffs involved

Always prioritize code cleanliness, maintainability, and adherence to React and JavaScript best practices while working within the established project architecture.