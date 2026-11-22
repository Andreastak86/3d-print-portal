# 001: Next.js-serveren som mellomledd, SSE til nettleseren

**Dato:** 2026-11-21 · **Status:** Vedtatt

## Kontekst

Moonraker har REST og WebSocket. Nettleseren kunne i prinsippet snakket direkte med printeren, men:

- Moonraker avviser forespørsler fra andre opprinnelser (CORS) med mindre `cors_domains` endres i printerens konfigurasjon. Det skal vi ikke gjøre.
- Tobias skal ikke ha tilgang til rå G-code eller temperaturkommandoer. Har nettleseren direkte tilgang, kan alt sendes.
- En eventuell API-nøkkel må holdes unna nettleseren.

Next.js App Router har ingen innebygd WebSocket-server uten en egen server.

## Beslutning

- All printerkommunikasjon går gjennom Next.js-serveren (`src/server/`).
- Serveren holder **én** WebSocket mot Moonraker (singleton på `globalThis`) og deler statusen med alle klienter.
- Status sendes til nettleseren med **Server-Sent Events** (`/api/printer/events`). SSE fungerer i vanlige route handlers, kobler til igjen automatisk og passer fordi datastrømmen i praksis er enveis. Kommandoer (start/pause osv.) blir vanlige POST-endepunkter med rolle- og tilstandssjekk på serveren.
- Moonrakers rådataformat oversettes til egne domenetyper (`src/lib/printer/types.ts`), så grensesnittet ikke er bundet til Moonraker.

## Konsekvenser

- Ingen endringer på printeren er nødvendig.
- Sikkerhetsregler håndheves på ett sted, på serveren.
- Ett ekstra ledd, men latensen er neglisjerbar på et lokalt nett.
- Krever en Node-server som kjører (ikke statisk eksport). Det passer med en lokal PC eller hjemmeserver.
