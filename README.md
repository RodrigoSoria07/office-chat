# Office ✺ — chat de oficina en la terminal

Un "oficina virtual" en tiempo real dentro de tu terminal. Una persona **crea** la
oficina (host) y las demás **se unen** desde la misma red. Incluye canales, mensajes
directos, estados, colores por persona y una mesa de trabajo con asientos.

---

## 1. Instalación

Necesitas **Node.js** instalado (versión 18 o superior). Compruébalo con `node -v`.

**Opción A — desde GitHub (recomendada, no necesitas la carpeta):**

```
npm install -g github:RodrigoSoria07/office-chat
```

Eso deja el comando **`office`** disponible en cualquier terminal (CMD/PowerShell).

**Opción B — desde la carpeta del proyecto:**

```
npm install
npm install -g .
```

> Si no quieres instalarlo global, también puedes correrlo con
> `node bin/office.js <comando>` desde la carpeta.

---

## 2. Cómo conectarse

Todos deben estar en la **misma red** (mismo Wi-Fi / red de la oficina).

### El host crea la oficina

```
office create
```

- Te preguntará el **nombre de la oficina** (o pásalo directo con `--room "Mi Oficina"`).
- Al iniciar, muestra una línea como:
  `Share this:  office join 192.168.1.5`
  → esa **IP** es la que comparten los demás para entrar.

### Los demás se unen

```
office join 192.168.1.5
```

(Reemplaza `192.168.1.5` por la IP que mostró el host.)

### Oficina con contraseña (opcional)

```
office create --password claveSecreta
office join 192.168.1.5 --password claveSecreta
```

### ¿No sabes tu IP? (host)

El host la verá al crear la oficina. Si la necesitas a mano, en Windows:
`ipconfig` → busca **"Dirección IPv4"** (algo como `192.168.x.x`).

### Tu identidad

Puedes pasar tu nombre y avatar al conectar:

```
office join 192.168.1.5 --name Ana --avatar 👩‍💻
```

O guardarlos una sola vez para que se usen siempre:

```
office config --name Ana --avatar 👩‍💻 --color azul
```

Avatares disponibles (solo personas): 👨‍💻 👩‍💻 👨 👩 🧑

---

## 3. Comandos disponibles (dentro de la app)

Escribe normal y presiona Enter para mandar un mensaje al canal actual.
Los comandos empiezan con `/`:

### Canales
| Comando | Qué hace |
|---|---|
| `/crear #canal` | Crea un canal público |
| `/crear #canal --privado clave` | Crea un canal privado (🔒, solo entran con la clave) |
| `/join #canal [clave]` | Entra a un canal (la clave solo si es privado) |
| `/canales` | Lista los canales (los privados con 🔒) |

### Mensajes
| Comando | Qué hace |
|---|---|
| *(escribir texto)* | Manda el mensaje al canal actual |
| `/dm @usuario mensaje` | Mensaje **directo** y privado a una persona |
| ` ```js … ``` ` | Bloque de código con resaltado (tres comillas invertidas) |

### Estado y presencia
| Comando | Qué hace |
|---|---|
| `/estado QA` · `Desarrollo` · `RYD` · `Disponible` | Pone tu estado (o texto libre) |
| `/away` | Te marca como ausente |
| `/back` | Vuelves a disponible |
| `/board` | Muestra el estado de todos |
| `/who` | Lista quién está conectado |

### Color
| Comando | Qué hace |
|---|---|
| `/color azul` | Cambia tu color (se guarda) |
| | Paleta: azul · verde · morado · cyan · amarillo · rosa · naranja · blanco |

### Mesa de trabajo
| Comando | Qué hace |
|---|---|
| `/mesa` | Dibuja la mesa con los 6 asientos |
| `/asiento <1-5>` | Te mueves a un asiento libre |
| | El **host** queda fijo en el asiento **6** (abajo-derecha, marcado con ★) |

> El panel derecho muestra la mesa en vivo: cada emoji aparece sentado en su lugar,
> con su nombre a color y su estado.

### Utilidades / salir
| Comando | Qué hace |
|---|---|
| `/clear` (o `/limpiar`) | Limpia tu pantalla de chat |
| `/help` | Muestra la lista de comandos |
| `/quit` | Sale de la oficina |
| **Ctrl + C (dos veces)** | También sale (el primero avisa, el segundo confirma) |

---

## 4. Notas

- El host sostiene la oficina: si el host cierra, la oficina se cierra.
- Hoy funciona en **red local** (sin internet ni cuentas). El transporte está hecho
  para poder agregar conexión remota más adelante sin cambiar la app.

## Desarrollo

```
npm test    # corre las pruebas (vitest)
```
