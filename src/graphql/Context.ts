import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { BatchLoader } from "./DataLoader.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { BaseModel } from "../models/BaseModel.ts";

// Define a constructor type for models
type ModelConstructor<T extends BaseModel = BaseModel> = {
  new (...args: unknown[]): T;
  name: string;
  [key: string]: unknown; // Add index signature to make it compatible with DatabaseRecord
};

// Define the Context interface
interface Context {
  adapter: DatabaseAdapter;
  modelRegistry: ModelRegistry;
  getLoader: <T extends BaseModel>(
    model: ModelConstructor<T>,
  ) => BatchLoader<number, T>;
}

export class ContextFactory {
  private loaders: Map<string, BatchLoader<number, BaseModel>>;

  constructor(
    private adapter: DatabaseAdapter,
    private modelRegistry: ModelRegistry,
  ) {
    this.loaders = new Map();
  }

  createContext(): Context {
    const context: Context = {
      adapter: this.adapter,
      modelRegistry: this.modelRegistry,
      getLoader: <T extends BaseModel>(model: ModelConstructor<T>) =>
        this.getLoader(model),
    };

    return context;
  }

  private getLoader<T extends BaseModel>(
    model: ModelConstructor<T>,
  ): BatchLoader<number, T> {
    const modelName = model.name;

    // Validate model exists in registry using static method
    if (!ModelRegistry.hasModel(modelName)) {
      throw new Error(`Model ${modelName} not registered in ModelRegistry`);
    }

    if (!this.loaders.has(modelName)) {
      this.loaders.set(
        modelName,
        new BatchLoader(async (ids: readonly number[]) => {
          const results = await Promise.all(
            ids.map((id) => this.adapter.findById(model, id)),
          );
          return results as T[];
        }),
      );
    }

    return this.loaders.get(modelName) as BatchLoader<number, T>;
  }

  clearLoaders(): void {
    this.loaders.forEach((loader) => loader.clearAll());
  }
}
