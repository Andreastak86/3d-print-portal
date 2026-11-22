# 3D Print Portal

Vår egen webportal for Elegoo Neptune 4 Plus (Klipper + Moonraker). Kjører lokalt på hjemmenettet og skal ikke eksponeres mot internett.

**Status:** Fase 2 er ferdig: en egen side for Tobias og et adminpanel med printerkontroll.

## Hva den kan

**Tobias (`/`, ingen innlogging)**
- Galleri med godkjente utskrifter (bilde, tid, vekt) og filter på kategori
- Start med sjekkliste: «platen er tom», pluss «en voksen er til stede» hvis det er slått på
- **Selvbetjening (valgfritt):** med «Kan starte alle filer og laste opp egne» får Tobias en **«Last opp fil»**-boks (dra-og-slipp av .gcode fra OrcaSlicer) og ser alle filene på printeren. Nye filer havner øverst med «Ny!»-merke, og startvinduet åpnes rett etter opplasting. Filene lagres i mappen `tobias/` på printeren
- Stor live visning med fremdriftsring, når den blir ferdig, «Visste du?»-fakta og konfetti når noe blir ferdig
- Pause/fortsett og knapper for **begge lysene**, dyselyset og topplyset (hvis admin tillater det), og en melding fra admin
- Liste over det han har printet
- Guide: **«Slik printer du noe nytt»** (`/slik-printer-du`), fra MakerWorld via OrcaSlicer til godkjenning og start

**Admin (`/admin`, passord)**
- **Oversikt:** live status, pause, fortsett, avbryt, **nødstopp**, forvarming (PLA/PETG), nedkjøling, hjem akser, lys og temperatur
- **Filer:** alle G-code-filer med miniatyrbilder, opplasting, sletting, start og godkjenning for Tobias. Filer fra OrcaSlicer kopieres automatisk til `portal/` ved godkjenning, fordi `.cache` kan bli ryddet bort.
- **Godkjente:** rediger navn, ikon, kategori og notat, eller fjern
- **Statistikk:** periodevalg (7/30/90 dager, i år, alt), nøkkeltall, kostnadsestimat (plast + strøm), filament og printetid per uke/måned, klokkeslett og ukedag, utfall, filament per type og farge, mest printet
- **CSV-eksport** for Excel: alle utskrifter, oppsummering per måned og aktivitetslogg. Semikolon og desimalkomma, så filen åpnes riktig i norsk Excel
- **Konsoll:** send G-code og se svar fra Klipper
- **System:** CPU, minne, disk, versjoner og nedlasting av logger
- **Aktivitet:** hvem gjorde hva, og når
- **Innstillinger:** hva Tobias får lov til, et tidsvindu for start, en melding til Tobias og priser for kostnadsestimatet

**Overalt:** lys modus som standard, med bryter for mørk modus (☾/☀). Valget huskes i nettleseren.

## Kom i gang

Krever Node.js 22 eller nyere (utviklet på Node 24).

```powershell
npm install
copy .env.example .env.local   # sett PRINTER_URL
npm run dev                    # utvikling: http://localhost:3000
```

### Daglig bruk

Dobbeltklikk `start.bat`. Første gang bygges portalen, deretter starter den med én gang.

- På denne PC-en: http://localhost:3000
- Fra andre enheter på nettet: `http://<PC-ens-IP>:3000`. PC-ens IP finner du med `ipconfig` (Wi-Fi → IPv4).

Etter kodeendringer må portalen bygges på nytt: `npm run build`, eller slett `.next`-mappen og kjør `start.bat`.

### Tilgang fra andre enheter (engangsoppsett)

Windows-brannmuren blokkerer port 3000 som standard. Åpne den for private nettverk ved å kjøre dette i PowerShell **som administrator**:

```powershell
New-NetFirewallRule -DisplayName "3D Print Portal" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

Sjekk også at Wi-Fi-nettverket er satt som **privat** i Windows (Innstillinger → Nettverk og Internett → Wi-Fi → nettverksprofil).

**Anbefalt:** Gi printeren (og gjerne PC-en) fast IP gjennom en DHCP-reservasjon i ruteren, så adressen ikke endrer seg.

## Konfigurasjon (`.env.local`)

| Variabel | Beskrivelse |
|---|---|
| `PRINTER_URL` | Adressen til Moonraker. Neptune 4 Plus svarer på port 80, f.eks. `http://192.168.10.111` |
| `MOONRAKER_API_KEY` | Valgfri. Ikke nødvendig når PC-en er en «betrodd klient» (slik det er i dag) |
| `ADMIN_PASSWORD` | Passord for `/admin`. **Må settes** for at adminpanelet skal virke |
| `PRINTER_LIGHT_PIN` | Lyset ved printerhodet (`output_pin`). Standard er `caselight1`. Tom verdi skjuler knappen |
| `PRINTER_TOP_LIGHT_MACRO` | Makro som slår topplyset av og på. Standard er `MODLELIGHT_SWITCH` (Elegoo). Tom verdi skjuler knappen |
| `PRINTER_MOCK` | `true` = simulert, interaktiv printer (start, pause, avbryt osv.) for testing uten å printe |
| `MOCK_PRINT_SECONDS` | Hvor lenge en simulert utskrift varer (standard 120) |
| `DATA_DIR` | Hvor portalen lagrer data. Standard er `./data` |

Data (godkjente utskrifter, innstillinger og aktivitetslogg) ligger i `data/portal.json`. Ta sikkerhetskopi ved å kopiere `data/`-mappen.

## Kommandoer

| Kommando | Hva |
|---|---|
| `npm run dev` | Utviklingsserver (tilgjengelig på nettverket) |
| `npm run build` / `npm start` | Produksjonsbygg / -server |
| `npm test` | Enhetstester (Vitest) |
| `npm run typecheck` | TypeScript-sjekk |
| `npm run lint` | ESLint |

## Arkitektur

```
Nettleser ──HTTP/SSE──▶ Next.js-server ──REST/WebSocket──▶ Moonraker (printer)
```

Nettleseren snakker **aldri** direkte med printeren. Serveren holder én WebSocket mot Moonraker og strømmer status videre med Server-Sent Events. Se [docs/decisions](docs/decisions) for begrunnelsene.

```
src/
├─ app/                     Sider og API-ruter (App Router)
│  ├─ admin/                Innlogging + adminsider (route group «(panel)»)
│  └─ api/
│     ├─ printer/           events (SSE), status, history, thumbnail (åpne)
│     ├─ tobias/            bibliotek, start, pause, lys (åpne, men regelstyrt)
│     └─ admin/             alt annet (krever innlogging)
├─ components/
│  ├─ ui/                   Generelle byggeklosser (Card, Badge, ProgressBar, ikoner)
│  ├─ printer/              Delte printer-komponenter (kort, historikk, status)
│  ├─ tobias/               Tobias-siden
│  └─ admin/                Adminpanelet
├─ hooks/                   usePrinter (SSE), useHistory
├─ lib/                     Delt kode, trygt i nettleseren (typer, formattering, regler for Tobias, statistikk)
└─ server/                  Kun server: config, auth, lagring, bibliotek, Moonraker-klient, simulert printer
   ├─ moonraker/            client.ts (WebSocket), rest.ts, state.ts (ren logikk), types.ts
   └─ printer/              getPrinter()-singleton, PrinterSource-grensesnitt, mock
```

## Veikart

1. ✅ **MVP:** dashboard med status, temperaturer, aktiv utskrift og historikk
2. ✅ **Roller og kontroll:** Tobias-side, adminpanel, godkjente utskrifter, printerkontroll, filer, konsoll, logger og statistikk
3. Varsler (f.eks. på mobil når en utskrift er ferdig), mer filamentstatistikk per farge/type
4. Modellbibliotek: STL, kategorier, 3D-forhåndsvisning (Three.js)
5. Automatisk slicing med OrcaSlicer CLI
6. Parametrisk modellgenerator (OpenSCAD)
7. Flytte til en dedikert hjemmeserver
