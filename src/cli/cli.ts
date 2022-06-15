#!/usr/bin/env node

import yargs from "yargs";

(async () => {
  yargs(process.argv.slice(2))
    .scriptName("restfile")
    .env("RESTFILE")
    .command(await import("./commands/default"))
    .command(await import("./commands/init"))
    .command(await import("./commands/repl"))
    .demandCommand()
    .help().argv;
})();
