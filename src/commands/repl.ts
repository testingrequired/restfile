import { Argv } from "yargs";
import repl from "node:repl";

export const command = "repl <filePath>";

export const description = "Work with restfile in a repl";

interface Arguments {
  filePath: string;
}

export const builder = (yargs: Argv<Arguments>) =>
  yargs.positional("filePath", {
    type: "string",
    description: "Path to restfile",
    demandOption: true,
  });

export const handler = async (argv: Arguments) => {
  console.log("Loading repl for " + argv.filePath);

  repl.start("> ");
};
