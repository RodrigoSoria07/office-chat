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

const COLORS = [
  "#ff007f", // Neon Pink
  "#e10098", // Hot Pink/Magenta
  "#b400b4", // Purple
  "#7800cc", // Deep Purple/Indigo
  "#007fff", // Neon Blue
  "#00f5d4"  // Neon Teal/Green
];

async function typeLine(text, colorHex, speed = 10) {
  const coloredText = chalk.hex(colorHex)(text);
  for (let char of coloredText) {
    process.stdout.write(char);
    await delay(speed);
  }
  process.stdout.write("\n");
}

export async function runStartupAnimation(room, isHost, identityName = "ANONYMOUS") {
  // Clear the screen using ANSI escape code
  process.stdout.write("\x1Bc");
  await delay(100);

  // Render Logo with typewriter effect line-by-line
  for (let i = 0; i < LOGO.length; i++) {
    await typeLine(LOGO[i], COLORS[i % COLORS.length], 5);
  }
  console.log("");
  await delay(150);

  // Print system messages with typing animation
  const lines = [
    `» CORE IDENTITY: ${chalk.bold.hex("#00f5d4")(identityName.toUpperCase())}`,
    `» SECURITY PROTOCOL: SHIELD-V2 ACTIVE`,
    isHost 
      ? `» INITIATING HOST MATRIX ON PORT 4040...` 
      : `» LOCATING DESTINATION SECTOR [ROOM: ${chalk.bold.hex("#ff007f")(room.toUpperCase())}]...`,
    `» DISPATCHING CONNECTION DECRYPTOR...`
  ];

  for (const line of lines) {
    await typeLine("   " + line, "#888888", 8);
    await delay(80);
  }
  console.log("");

  // Animated connection progress bar
  const barWidth = 40;
  for (let i = 0; i <= 100; i += Math.floor(Math.random() * 8) + 2) {
    if (i > 100) i = 100;
    const filledLength = Math.round((i * barWidth) / 100);
    const filled = "█".repeat(filledLength);
    const empty = "░".repeat(barWidth - filledLength);
    
    const percentStr = `${i}%`.padStart(4);
    const bar = chalk.hex("#ff007f")("[") + chalk.hex("#00f5d4")(filled) + chalk.gray(empty) + chalk.hex("#ff007f")("]");
    
    process.stdout.write(`\r   ${bar}  ${chalk.hex("#00f5d4")(percentStr)}  ${chalk.gray("TUNNELING...")}`);
    await delay(Math.random() * 60 + 20);
  }

  // Success message
  const barComplete = chalk.hex("#ff007f")("[") + chalk.green("████████████████████████████████████████") + chalk.hex("#ff007f")("]");
  process.stdout.write(`\r   ${barComplete}  ${chalk.green("100%")}  ${chalk.bold.green("LINK ESTABLISHED!")}\n\n`);
  
  await delay(700);
}
