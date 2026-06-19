# Office — terminal chat for developers

A real-time "virtual office" in your terminal. One person hosts, others join over
the same network. Built as a Node.js CLI with a full-screen TUI styled after the
Claude Code look (warm orange accent, rounded welcome banner, `✺` logo).

## Install

From inside `office-chat/`:

```
npm install
npm install -g .
```

After the global install, the `office` command is available anywhere.
(Or run without installing globally: `node bin/office.js <command>`.)

## Use

Host an office (prints your LAN IP for others to join). El host pone el
**nombre de la oficina** (te lo pregunta, o pásalo con `--room`):

```
office create --name ana --avatar 👩‍💻 --room "Oficina Creative-LATAM"
```

Ese nombre aparece como título del panel para todos los que se unen.

Join an office (use the IP the host shows):

```
office join 192.168.1.5 --name leo --avatar 👨‍💻
```

Optional password to keep the room private:

```
office create --password teamsecret
office join 192.168.1.5 --password teamsecret
```

## In-app commands

- **Canales:** `/crear #canal [--privado clave]` · `/join #canal [clave]` · `/canales`
  - Los canales privados se listan con 🔒 y sus mensajes solo llegan a los miembros.
- **Mensajes:** escribe normal para el canal actual · `/dm @user msg`
- **Estado:** `/estado QA|Desarrollo|RYD` (o texto libre) · `/away` · `/back` · `/board`
- **Color:** `/color azul` (paleta: azul · verde · morado · cyan · amarillo · rosa · naranja · blanco)
  - Cada persona recibe un color distinto al entrar; con `/color` lo cambias y se guarda.
- **Mesa de trabajo:** `/mesa` dibuja la estación (6 asientos, 3 arriba / 3 abajo).
  - El **host queda fijo en el asiento 6** (abajo-derecha, marcado con ★).
  - `/asiento <1-5>` te mueve a un asiento libre.
- **Otros:** `/who` · `/clear` (o `/limpiar`) · `/help` · `/quit`
- **Salir:** `/quit` · o **Ctrl+C dos veces** (el primero avisa, el segundo sale).

## Set your identity once

```
office config --name ana --avatar 👩‍💻 --color "#D97757"
```

Saved to `~/.office/config.json` and reused on every `create`/`join`.

## How it works

- `office create` starts an in-process WebSocket relay and joins it as a client.
  If the host quits, the office closes.
- Clients talk to the relay through a swappable `Transport` interface. v1 ships a
  LAN transport (no internet, no accounts); a remote transport can be added later
  behind the same interface.
- The relay holds authoritative room state (roster, channels, recent history,
  statuses) and broadcasts JSON messages to everyone.

## Avatars

Avatars are person emojis only: 👨‍💻 👩‍💻 👨 👩 🧑 (plus skin-tone variants).

## Develop

```
npm test    # run the vitest suite
```
