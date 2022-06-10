import { Form, List } from "enquirer/lib/prompts";
import * as fs from "fs/promises";

export const command = "init <newFilePath>";

export const description = "Generate empty restfile";

export const builder = (yargs) =>
    yargs
        .positional("newFilePath", {
            type: "string",
            description: "Path for new restfile",
        });

export const handler = async (argv) => {
    const documentDataForm = new Form({
        name: "document",
        message: "Please provide the following information:",
        choices: [
          { name: "name", message: "Name" },
          { name: "description", message: "Description (Optional)" },
        ],
      });

      const documentData = await documentDataForm.run();

      const envDataList = new List({
        name: "envs",
        message: "Type comma-separated env names",
      });

      const envData = await envDataList.run();

      const fileContent = [
        `name: ${documentData.name}`,
        ...(documentData.description
          ? [`description: ${documentData.description}`]
          : []),
        `envs: [${envData.join(", ")}]`,
        "---",
        "",
        "---",
        "",
        "",
      ].join("\n");

      try {
        await fs.writeFile(argv.newFilePath, fileContent);
        console.log(`Initialized new restfile: ${argv.newFilePath}`);
      } catch (e) {
        console.log(
          `Error inititalizing new restfile: ${argv.newFilePath}\n\n ${e.message}`
        );
      }
  };