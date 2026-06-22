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

// Matrix Green Color Palette
const MATRIX_GREEN = "#39FF14"; // Bright matrix neon green
const DARK_GREEN = "#008F11";   // Classic dark matrix green
const DIM_GREEN = "#003B00";    // Very dark background green

export async function runStartupAnimation(room, isHost, identityName = "ANONYMOUS") {
  const width = Math.min(process.stdout.columns || 80, 80);
  const height = Math.min(process.stdout.rows || 24, 16);

  // Clear screen
  process.stdout.write("\x1Bc");
  await delay(50);

  // --- MATRIX BINARY RAIN ANIMATION (FAST) ---
  const streams = Array.from({ length: width }, () => ({
    y: Math.floor(Math.random() * -height),
    speed: Math.floor(Math.random() * 2) + 1,
  }));

  // Run the binary rain for 22 frames (fast waterfall effect)
  for (let frame = 0; frame < 22; frame++) {
    let screenStr = "\x1B[H"; // Cursor to top-left
    for (let y = 0; y < height; y++) {
      let line = "";
      for (let x = 0; x < width; x++) {
        const s = streams[x];
        if (y <= s.y && y > s.y - 8) {
          const char = Math.random() > 0.5 ? "1" : "0";
          const dist = s.y - y;
          if (dist === 0) {
            line += chalk.bold.hex("#ffffff")(char); // white head
          } else if (dist < 3) {
            line += chalk.bold.hex(MATRIX_GREEN)(char); // matrix green
          } else if (dist < 6) {
            line += chalk.hex(DARK_GREEN)(char); // darker green
          } else {
            line += chalk.hex(DIM_GREEN)(char); // faint green
          }
        } else {
          line += " ";
        }
      }
      screenStr += line + "\n";
    }
    process.stdout.write(screenStr);

    // Update streams
    for (let x = 0; x < width; x++) {
      streams[x].y += streams[x].speed;
      if (streams[x].y - 8 > height) {
        streams[x].y = Math.floor(Math.random() * -4);
      }
    }
    await delay(30);
  }

  // Clear screen before showing the logo
  process.stdout.write("\x1Bc");
  await delay(50);

  // --- PRINT LOGO FROM TOP TO BOTTOM (MATRIX GREEN) ---
  for (const line of LOGO) {
    console.log(chalk.hex(MATRIX_GREEN)(line));
    await delay(60); // Fast drop-down sweep effect
  }
  console.log("");
  await delay(100);

  // --- PRINT SYSTEM LOGS (MATRIX GREEN INTERFACE) ---
  const lines = [
    `» SYS.IDENTITY: ${chalk.bold.hex(MATRIX_GREEN)(identityName.toUpperCase())}`,
    `» SECURITY.DECRYPTOR: ACTIVE [GUEST_KEY]`,
    isHost 
      ? `» INITIALIZING CHAT SERVER MATRIX [PORT: 4040]...` 
      : `» RESOLVING NODE DESTINATION [HOST: ${chalk.bold.hex(MATRIX_GREEN)(room.toUpperCase())}]...`,
    `» SYNCHRONIZING WITH DIGITAL STREAM...`
  ];

  for (const line of lines) {
    const coloredLine = chalk.hex(DARK_GREEN)("   " + line);
    for (const char of coloredLine) {
      process.stdout.write(char);
      await delay(4);
    }
    process.stdout.write("\n");
    await delay(50);
  }
  console.log("");

  // --- PROGRESS BAR (MATRIX GREEN) ---
  const barWidth = 40;
  for (let i = 0; i <= 100; i += Math.floor(Math.random() * 10) + 3) {
    if (i > 100) i = 100;
    const filledLength = Math.round((i * barWidth) / 100);
    const filled = "█".repeat(filledLength);
    const empty = "░".repeat(barWidth - filledLength);
    
    const percentStr = `${i}%`.padStart(4);
    const bar = chalk.hex(DARK_GREEN)("[") + chalk.hex(MATRIX_GREEN)(filled) + chalk.hex(DIM_GREEN)(empty) + chalk.hex(DARK_GREEN)("]");
    
    process.stdout.write(`\r   ${bar}  ${chalk.hex(MATRIX_GREEN)(percentStr)}  ${chalk.hex(DARK_GREEN)("CONNECTING...")}`);
    await delay(Math.random() * 40 + 15);
  }

  // Connection established
  const barComplete = chalk.hex(DARK_GREEN)("[") + chalk.hex(MATRIX_GREEN)("████████████████████████████████████████") + chalk.hex(DARK_GREEN)("]");
  process.stdout.write(`\r   ${barComplete}  ${chalk.hex(MATRIX_GREEN)("100%")}  ${chalk.bold.hex(MATRIX_GREEN)("DECRYPTION COMPLETE. SYSTEM ONLINE.")}\n\n`);
  
  await delay(800);
}
