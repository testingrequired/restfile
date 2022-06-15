import { Request } from "../types";
import { Form, FormPromptOptions } from "enquirer/lib/prompts";

export async function runRequestPrompts<T = any>(request: Request): Promise<T> {
  let prompts: FormPromptOptions[] = [];

  for (const [key, value] of Object.entries(request.prompts)) {
    const prompt: FormPromptOptions = {
      name: key,
      message: key,
    };

    if (typeof value === "object" && typeof value.default != "undefined") {
      prompt.initial = value.default;
    }

    prompts.push(prompt);
  }

  const formPrompt = new Form({
    name: "prompts",
    message: "Please Fill In Request Prompts:",
    choices: prompts,
  });

  const promptData = await formPrompt.run();

  return promptData;
}
