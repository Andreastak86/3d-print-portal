# 003: Lagring i JSON-fil og enkel admin-innlogging

**Dato:** 2026-11-21 · **Status:** Vedtatt

## Kontekst

Fase 2 trenger lagring for godkjente utskrifter, innstillinger for Tobias og en aktivitetslogg. Admin-funksjonene må beskyttes. Løsningen kjører på én PC på hjemmenettet og skal være enkel å flytte.

## Beslutning: lagring

- **Én JSON-fil** (`data/portal.json`, kan overstyres med `DATA_DIR`). Datamengden er liten: titalls godkjente utskrifter, én innstillingsblokk og maks 300 aktivitetsinnslag.
- Skrivinger går i kø, så de aldri overlapper, og skrives atomisk: først til en midlertidig fil, deretter `rename`.
- En korrupt fil overskrives ikke. Den døpes om til `portal.json.corrupt-<tid>`, og portalen starter med blanke data.
- `data/` er utelatt fra git. Sikkerhetskopi tar du ved å kopiere mappen.

**Når bør vi bytte til SQLite?** Når modellbiblioteket kommer (fase 4) med mange modeller, kategorier og søk. `store.ts` er det eneste stedet som vet om filformatet, så byttet blir lokalt.

## Beslutning: autentisering

- Admin-passordet ligger i `ADMIN_PASSWORD` i `.env.local`. Det er ingen brukerdatabase, fordi det bare finnes én admin.
- Økten er en cookie med `utløpstid.HMAC-SHA256(utløpstid)`. Hemmeligheten genereres ved første oppstart og lagres i `portal.json`. Cookien er `httpOnly` og `sameSite=strict`. Den er ikke `secure`, fordi portalen går over http på hjemmenettet.
- Passordet sammenlignes i konstant tid, og det er maks 5 forsøk per minutt.
- **Tilgangen sjekkes nær dataene**, slik Next-dokumentasjonen anbefaler: hver adminside kaller `requireAdminPage()`, og hver admin-API-rute kaller `adminGuard()`. Layouten sjekker ingenting, fordi layouter ikke rendres på nytt ved navigasjon.
- Tobias trenger ikke logge inn. Det han får lov til, styres av innstillingene og håndheves på serveren i `src/lib/portal/policy.ts`.

## Sikkerhetsmodell for Tobias

| Tobias kan | Tobias kan ikke |
|---|---|
| Starte **godkjente** utskrifter, eller **alle filer** hvis «Kan starte alle filer» er på, når printeren er ledig, sjekklisten er krysset av og eventuelt innenfor et tidsvindu | Starte filer utenfor gcodes-mappen |
| Sette på pause og fortsette (hvis det er slått på) | Avbryte, nødstoppe eller endre temperatur |
| Skru lyset av og på (hvis det er slått på), med en fast kommando | Sende G-code |

Alle regler sjekkes på serveren. Grensesnittet bruker de samme funksjonene bare for å forklare hvorfor en knapp er låst.

### Endring 2026-11-22: selvbetjening

Etter ønske fra admin kan Tobias få bruke printeren selv, også når ingen voksne er hjemme:
- `canStartAnyFile`: alle G-code-filer på printeren vises og kan startes.
- `requireAdult`: styrer om «En voksen er her» står på sjekklisten. «Byggeplaten er tom» kreves alltid.

Begge er av som standard (den forsiktige varianten) og slås på under Innstillinger. Tekstene på Tobias-siden og i guiden følger innstillingene.
