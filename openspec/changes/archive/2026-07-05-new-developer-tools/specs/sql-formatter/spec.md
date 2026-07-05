## ADDED Requirements

### Requirement: SQL formatting

The system SHALL format SQL queries with consistent indentation, line breaks, and keyword casing. The system SHALL support SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, and ALTER TABLE statements.

#### Scenario: Format a simple SELECT

- **WHEN** user enters `select id,name,email from users where active=1 order by name`
- **THEN** output shows properly indented SQL with uppercase keywords:

```
SELECT
  id,
  name,
  email
FROM users
WHERE active = 1
ORDER BY name
```

#### Scenario: Format a complex JOIN query

- **WHEN** user enters `select u.name,o.total from users u join orders o on u.id=o.user_id`
- **THEN** the JOIN clause is properly indented and ON condition is on its own line

### Requirement: Syntax error handling

The system SHALL display a warning when the SQL contains syntax errors that prevent formatting, without blocking the formatting of valid sections.

#### Scenario: Missing keyword

- **WHEN** user enters `SELECT FROM users` (no columns)
- **THEN** the query is still formatted but a warning badge appears: "SQL may be incomplete"
