// src/ui/animation.js
import chalk from "chalk";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const LOGO = [
  " ██████╗ ███████╗███████╗██╗ ██████╗███████╗   ██████╗██╗  ██╗ █████╗ ████████╗",
  "██╔═══██╗██╔════╝██╔════╝██║██╔════╝██╔════╝  ██╔════╝██║  ██║██╔══██╗╚══██╔══╝",
  "██║   ██║█████╗  █████╗  ██║██║     █████╗    ██║     ███████║███████║   ██║   ",
  "██║   ██║██╔══╝  ██╔══╝  ██║██║     ██╔══╝    ██║     ██╔══██║██╔══██║   ██║   ",
  "╚██████╔╝██║     ██║     ██║╚██████╗███████╗  ╚██████╗██║  ██║██║  ██║   ██║   ",
  " ╚═════╝ ╚═╝     ╚═╝     ╚═╝ ╚══════╝╚══════╝   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   "
];

// Matrix Green Color Palette (truecolor — used on Windows where it renders well)
const MATRIX_GREEN = "#39FF14"; // Bright matrix neon green
const DARK_GREEN = "#008F11";   // Classic dark matrix green
const DIM_GREEN = "#003B00";    // Very dark background green

// OS-aware entry point. The fast truecolor "matrix rain" looks great on the
// Windows console but garbles on some Linux/SSH terminals (raw truecolor +
// full-reset escapes print as text). So pick an intro per platform, and skip
// entirely when the output can't render ANSI at all (pipes, no color) or when
// the user opted out.
export async function runStartupAnimation(room, isHost, identityName = "ANONYMOUS") {
  if (!process.stdout.isTTY || chalk.level === 0 || process.env.OFFICE_NO_ANIM) {
    return;
  }
  if (process.platform === "win32") {
    await matrixRain(room, isHost, identityName);
  } else {
    await terminalIntro(room, isHost, identityName);
  }
}

// --- WINDOWS: fast truecolor matrix binary rain -------------------------------
async function matrixRain(room, isHost, identityName) {
  const width = Math.min(process.stdout.columns || 80, 80);
  const height = Math.min(process.stdout.rows || 24, 16);

  process.stdout.write("\x1Bc"); // full reset
  await delay(50);

  const streams = Array.from({ length: width }, () => ({
    y: Math.floor(Math.random() * -height),
    speed: Math.floor(Math.random() * 2) + 1,
  }));

  for (let frame = 0; frame < 22; frame++) {
    let screenStr = "\x1B[H"; // cursor to top-left
    for (let y = 0; y < height; y++) {
      let line = "";
      for (let x = 0; x < width; x++) {
        const s = streams[x];
        if (y <= s.y && y > s.y - 8) {
          const char = Math.random() > 0.5 ? "1" : "0";
          const dist = s.y - y;
          if (dist === 0) line += chalk.bold.hex("#ffffff")(char);
          else if (dist < 3) line += chalk.bold.hex(MATRIX_GREEN)(char);
          else if (dist < 6) line += chalk.hex(DARK_GREEN)(char);
          else line += chalk.hex(DIM_GREEN)(char);
        } else {
          line += " ";
        }
      }
      screenStr += line + "\n";
    }
    process.stdout.write(screenStr);

    for (let x = 0; x < width; x++) {
      streams[x].y += streams[x].speed;
      if (streams[x].y - 8 > height) streams[x].y = Math.floor(Math.random() * -4);
    }
    await delay(30);
  }

  process.stdout.write("\x1Bc");
  await delay(50);
  await revealLogoAndLogs(room, isHost, identityName, (s) => chalk.hex(MATRIX_GREEN)(s), (s) => chalk.hex(DARK_GREEN)(s), (s) => chalk.hex(DIM_GREEN)(s));
}

// --- LINUX/macOS: portable intro (basic 16-color, no truecolor, no RIS) -------
async function terminalIntro(room, isHost, identityName) {
  // Standard clear (erase + home) — portable across xterm/gnome/konsole/SSH.
  process.stdout.write("\x1B[2J\x1B[H");
  await delay(40);

  // A short green "scanline" sweep made only of basic-color blocks.
  const width = Math.min(process.stdout.columns || 80, 80);
  for (let i = 0; i < 6; i++) {
    const bar = "█".repeat(Math.min(width, 8 + i * 12));
    process.stdout.write("\x1B[H" + chalk.green(bar) + "\n");
    await delay(45);
  }
  process.stdout.write("\x1B[2J\x1B[H");
  await delay(40);

  await revealLogoAndLogs(
    room, isHost, identityName,
    (s) => chalk.greenBright(s),
    (s) => chalk.green(s),
    (s) => chalk.gray(s)
  );
}

// --- shared: logo drop + system logs + progress bar ---------------------------
// `bright`, `mid`, `dim` are color functions chosen per platform.
async function revealLogoAndLogs(room, isHost, identityName, bright, mid, dim) {
  for (const line of LOGO) {
    console.log(bright(line));
    await delay(60);
  }
  console.log("");
  await delay(100);

  const lines = [
    `» SYS.IDENTITY: ${bright(identityName.toUpperCase())}`,
    `» SECURITY.DECRYPTOR: ACTIVE [GUEST_KEY]`,
    isHost
      ? `» INITIALIZING CHAT SERVER MATRIX...`
      : `» RESOLVING NODE DESTINATION [HOST: ${bright(String(room).toUpperCase())}]...`,
    `» SYNCHRONIZING WITH DIGITAL STREAM...`,
  ];

  for (const line of lines) {
    const coloredLine = mid("   " + line);
    for (const char of coloredLine) {
      process.stdout.write(char);
      await delay(4);
    }
    process.stdout.write("\n");
    await delay(50);
  }
  console.log("");

  const barWidth = 40;
  for (let i = 0; i <= 100; i += Math.floor(Math.random() * 10) + 3) {
    if (i > 100) i = 100;
    const filledLength = Math.round((i * barWidth) / 100);
    const filled = "█".repeat(filledLength);
    const empty = "░".repeat(barWidth - filledLength);
    const percentStr = `${i}%`.padStart(4);
    const bar = mid("[") + bright(filled) + dim(empty) + mid("]");
    process.stdout.write(`\r   ${bar}  ${bright(percentStr)}  ${mid("CONNECTING...")}`);
    await delay(Math.random() * 40 + 15);
  }

  const full = "█".repeat(barWidth);
  process.stdout.write(`\r   ${mid("[")}${bright(full)}${mid("]")}  ${bright("100%")}  ${bright("DECRYPTION COMPLETE. SYSTEM ONLINE.")}\n\n`);
  await delay(800);
}
