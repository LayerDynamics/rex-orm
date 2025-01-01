import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { BatchLoader } from "./DataLoader.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

export class ContextFactory {
  private loaders: Map<string, BatchLoader<any, any>>;

  constructor(private adapter: DatabaseAdapter) {
    this.loaders = new Map();
  }

  createContext() {
    const context = {
      adapter: this.adapter,
      getLoader: (model: any) => this.getLoader(model),
    };

    return context;
  }

  private getLoader(model: any) {
    const modelName = model.name;
    
    if (!this.loaders.has(modelName)) {
      this.loaders.set(
        modelName,
        new BatchLoader(async (ids: readonly number[]) => {
          const result = await this.adapter.findByIds(model, ids);
          return ids.map(id => result.find(r => r.id === id));
        })
      );
    }

    return this.loaders.get(modelName)!;
  }

  clearLoaders() {
    this.loaders.forEach(loader => loader.clearAll());
  }
}