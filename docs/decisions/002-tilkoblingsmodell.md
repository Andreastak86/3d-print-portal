# 002: Tilstandsmodell og robust tilkobling

**Dato:** 2026-11-21 · **Status:** Vedtatt

## Kontekst

Printeren slås av og på, mister Wi-Fi og starter Klipper på nytt. Moonraker kan dessuten svare selv om Klipper ikke er klar. Grensesnittet må vise hva som faktisk er galt, på en måte et barn forstår.

## Beslutning

Fire tilkoblingstilstander (`ConnectionState`):

| Tilstand | Betyr | Vises som |
|---|---|---|
| `connecting` | Portalen har nettopp startet | «Kobler til…» |
| `offline` | Moonraker svarer ikke | «Printeren er ikke tilkoblet» + tips |
| `klippy_not_ready` | Moonraker oppe, Klipper starter / har stoppet | «Starter opp…» / «Printeren har stoppet» |
| `ready` | Live status | Dashboard |

Nettleseren skiller i tillegg mellom «printeren er borte» og «portalen er borte» (PC-en er slått av).

Robusthet i `MoonrakerClient`:

- **Nye tilkoblingsforsøk** med økende ventetid (1 s → 30 s).
- **Tidsfrist ved tilkobling** (10 s), fordi Nodes WebSocket ikke har en egen.
- **Vakthund:** spør `server.info` hvert 15. sekund (hvert 3. sekund når Klipper ikke er klar). Uteblir svaret, regnes forbindelsen som død. Det fanger opp stille brudd, for eksempel når printeren mister strømmen uten å lukke TCP-forbindelsen.
- En død socket kobles fra tilstanden **før** den lukkes, siden `close` kan ta lang tid på en død forbindelse.
- Klipper-hendelser (`notify_klippy_ready/shutdown/disconnected`) gir umiddelbar oppdatering.
- Statusoppdateringer strupes til maks fire per sekund mot nettleseren.

## Fremdrift og tid igjen

- Fremdriften regnes som posisjon i selve G-code-delen av filen (`gcode_start_byte` til `gcode_end_byte`), slik Fluidd gjør. Klippers egen verdi tar med headeren med miniatyrbilder.
- Tid igjen bruker slicerens estimat de første 10 %, og deretter faktisk tempo.

## Observasjoner fra vår printer (Elegoo-versjon av Moonraker, API 1.5.0)

- Moonraker svarer via nginx på **port 80**. Port 7125 er stengt. WebSocket ligger på `/websocket`.
- PC-en er «betrodd klient», så ingen API-nøkkel trengs.
- Filer fra OrcaSlicer havner i `gcodes/.cache/` og kan forsvinne senere. Historikken må tåle `exists: false`.
- `print_stats.info.current_layer` er `null` fordi sliceren ikke sender `SET_PRINT_STATS_INFO`. Antall lag hentes da fra filens metadata.
