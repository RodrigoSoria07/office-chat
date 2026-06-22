#!/usr/bin/env node
import { Command } from "commander";
import { createCommand, joinCommand, configCommand } from "../src/cli.js";

const program = new Command();
program.name("office").description("Real-time terminal chat office for developers").version("0.1.0");

program.command("create")
  .description("Create and host an office")
  .option("--name <name>").option("--avatar <emoji>").option("--port <port>")
  .option("--password <password>").option("--room <room>")
  .option("--no-anim", "skip the startup animation")
  .action(createCommand);

program.command("join <host>")
  .description("Join an existing office by host IP")
  .option("--name <name>").option("--avatar <emoji>").option("--port <port>")
  .option("--password <password>")
  .option("--no-anim", "skip the startup animation")
  .action(joinCommand);

program.command("config")
  .description("Show or set your identity (name, avatar, color)")
  .option("--name <name>").option("--avatar <emoji>").option("--color <hex>")
  .action(configCommand);

program.parse();
