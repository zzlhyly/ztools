## ADDED Requirements

### Requirement: Global error handler prevents white-screen crashes
The Vue application SHALL register a global error handler via `app.config.errorHandler` in `src/main.ts` that catches unhandled component errors and displays a user-visible fallback instead of a white screen.

#### Scenario: Component render error
- **WHEN** a Vue component throws an error during rendering
- **THEN** the error is caught by the global handler and the user sees a localized error message instead of a blank page

#### Scenario: Error logged for debugging
- **WHEN** the global error handler catches an error
- **THEN** the error details (component name, error message, stack trace) are logged to the console for debugging

### Requirement: Error boundary does not break app navigation
The global error handler SHALL NOT prevent the user from navigating to other routes or tools after an error occurs.

#### Scenario: Navigate away after error
- **WHEN** a tool component crashes and the error handler displays the fallback
- **THEN** the user can still click sidebar links and navigate to other tools
