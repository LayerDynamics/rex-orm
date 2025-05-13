// src/cli/commands/generateModel.ts

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import {
  Confirm,
  Input,
  Select,
} from "https://deno.land/x/cliffy@v1.0.0-rc.4/prompt/mod.ts";
import { ensureDir, exists } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { extname } from "https://deno.land/std@0.203.0/path/mod.ts";
import { BaseModel } from "../../models/BaseModel.ts";

interface GenerateModelArgs {
  modelName: string;
}

export const generateModelCommand = new Command()
  .name("generate:model")
  .description("Generate a new ORM model")
  .arguments("<modelName:string>")
  .action(async (_options: void, modelName: string) => {
    const modelsDir = "./models";

    // Ensure models directory exists
    await ensureDir(modelsDir);

    const modelFilePath = `${modelsDir}/${modelName}.ts`;

    if (await exists(modelFilePath)) {
      console.error(`Model "${modelName}" already exists at ${modelFilePath}`);
      Deno.exit(1);
    }

    // Prompt user for fields
    const fields: { name: string; type: string; isPrimary: boolean }[] = [];

    console.log(
      `Defining fields for model "${modelName}" (type 'done' to finish):`,
    );

    while (true) {
      const fieldName = await Input.prompt({
        message: "Field name:",
      });

      if (fieldName.toLowerCase() === "done") {
        break;
      }

      const fieldType = await Select.prompt({
        message: "Field type:",
        options: [
          { name: "String", value: "string" },
          { name: "Integer", value: "number" },
          { name: "Boolean", value: "boolean" },
          { name: "Date", value: "Date" },
          { name: "Float", value: "number" },
        ],
      });

      const isPrimary = await Confirm.prompt({
        message: "Is this field a primary key?",
        default: false,
      });

      fields.push({
        name: fieldName,
        type: fieldType,
        isPrimary,
      });
    }

    // Generate model content
    let modelContent =
      `import { Entity, Column, PrimaryKey } from "rex-orm/decorators/mod.ts";

@Entity()
export class ${modelName} extends BaseModel {
`;

    fields.forEach((field) => {
      if (field.isPrimary) {
        modelContent += `  @PrimaryKey()\n`;
      } else {
        modelContent += `  @Column("${field.type}")\n`;
      }
      modelContent += `  ${field.name}: ${field.type};\n\n`;
    });

    modelContent += `}\n`;

    // Write model file
    await Deno.writeTextFile(modelFilePath, modelContent);
    console.log(`Model "${modelName}" has been created at ${modelFilePath}`);
  });
