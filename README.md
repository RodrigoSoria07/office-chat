# Office ✺ — terminal office chat

A real-time "virtual office" inside your terminal. One person **creates** the office (host) and
the others **join** from the same network. It includes channels, direct messages, statuses,
per-person colors, and a work table with seats.

---

## 1. Install

You need **Node.js** installed (version 18 or higher). Check it with `node -v`.

**Option A — from GitHub (recommended, no folder needed):**

```
npm install -g github:RodrigoSoria07/office-chat
```

That makes the **`office`** command available in any terminal (CMD/PowerShell).

**Option B — from the project folder:**

```
npm install
npm install -g .
```

> If you don't want a global install, you can also run it with
> `node bin/office.js <command>` from the folder.

---

## 2. How to connect

Everyone must be on the **same network** (same Wi-Fi / office network).

### The host creates the office

```
office create
```

- It asks for the **office name** (or pass it directly with `--room "My Office"`).
- On start, it prints a line like:
  `Share this:  office join 192.168.1.5`
  → that **IP** is what others use to join.

### The others join

```
office join 192.168.1.5
```

(Replace `192.168.1.5` with the IP the host showed.)

### Password-protected office (optional)

```
office create --password secretKey
office join 192.168.1.5 --password secretKey
```

### Don't know your IP? (host)

The host sees it when creating the office. If you need it by hand, on Windows:
`ipconfig` → look for **"IPv4 Address"** (something like `192.168.x.x`).

### Your identity

You can pass your name and avatar when connecting:

```
office join 192.168.1.5 --name Ana --avatar 👩‍💻
```

Or save them once so they're always used:

```
office config --name Ana --avatar 👩‍💻 --color blue
```

Available avatars (people only): 👨‍💻 👩‍💻 👨 👩 🧑

---

## 3. Available commands (inside the app)

Type normally and press Enter to send a message to the current channel.
Commands start with `/`:

### Channels
| Command | What it does |
|---|---|
| `/crear #channel` | Creates a public channel |
| `/crear #channel --privado key` | Creates a private channel (🔒, key required to join) |
| `/join #channel [key]` | Joins a channel (key only if private) |
| `/canales` | Lists channels (private ones with 🔒) |

### Messages
| Command | What it does |
|---|---|
| *(type text)* | Sends the message to the current channel |
| `/dm @user message` | **Direct**, private message to a person |
| ` ```js … ``` ` | Code block with syntax highlighting (three backticks) |

### Status and presence
| Command | What it does |
|---|---|
| `/estado QA` · `Development` · `R&D` · `Available` | Sets your status (or free text) |
| `/away` | Marks you as away |
| `/back` | Back to available |
| `/board` | Shows everyone's status |
| `/who` | Lists who's connected |

### Color
| Command | What it does |
|---|---|
| `/color blue` | Changes your color (saved) |
| | Palette: blue · green · purple · cyan · yellow · pink · orange · white |

### Work table
| Command | What it does |
|---|---|
| `/mesa` | Draws the table with 6 seats |
| `/asiento <1-5>` | Move to a free seat |
| | The **host** is fixed at seat **6** (bottom-right, marked with ★) |

> The right panel shows the table live: each emoji appears seated in its place, with its name
> in color and its status.

### Utilities / exit
| Command | What it does |
|---|---|
| `/clear` (or `/limpiar`) | Clears your chat screen |
| `/help` | Shows the command list |
| `/quit` | Leaves the office |
| **Ctrl + C (twice)** | Also exits (the first warns, the second confirms) |

---

## 4. Notes

- The host holds the office: if the host closes, the office closes.
- Today it runs on the **local network** (no internet or accounts). The transport layer is built
  so remote connectivity can be added later without changing the app.

## Development

```
npm test    # runs the tests (vitest)
```
