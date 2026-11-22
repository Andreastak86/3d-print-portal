<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Prosjektregler (3D Print Portal)

- Grensesnittet er på **norsk**, koden (navn, kommentarer) på engelsk.
- Nettleseren snakker aldri direkte med printeren. All Moonraker-tilgang går via `src/server/` (se `docs/decisions/001`).
- **Endre aldri** printerens firmware, Klipper-konfigurasjon eller innstillinger.
- Hold avhengighetene få. Spør før du legger til nye pakker.
- Ren logikk (Moonraker-data → domenetyper) ligger i `src/server/moonraker/state.ts` og skal ha tester.
- Test uten printer med `PRINTER_MOCK=true`. **Send aldri kontrollkommandoer (start/pause/avbryt/G-code) til den ekte printeren under testing.** Den kan være midt i en utskrift.
- Tilgang: adminsider kaller `requireAdminPage()`, admin-API kaller `adminGuard()`. Regler for Tobias ligger i `src/lib/portal/policy.ts` og håndheves på serveren.
- Kjør `npm test`, `npm run typecheck` og `npm run lint` før en oppgave regnes som ferdig.
