# ADR 0001: Keep the Next.js single app for the next phase

- Status: Accepted for the prototype (2026-11-25)
- Context: The FDE standard's baseline is a React/Vite web client plus a separate NestJS API. Kindra already exists as one Next.js App Router app with route handlers, server-only business rules and a store interface.
- Decision: Add the next-phase features to the existing app. Business rules stay on the server (`lib/alerts.ts`, route handlers), and the browser only calls the JSON routes under `app/api/`.
- Consequences: Faster delivery and no rewrite before the advisers have chosen features. The API is not yet a separate deployable and has no OpenAPI contract. Revisit before production, or if a mobile or desktop client is needed.
