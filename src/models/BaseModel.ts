import { ModelRegistry } from "./ModelRegistry.ts";

export abstract class BaseModel {
  constructor() {
    // Cast constructor to a known type
    ModelRegistry.registerModel(this.constructor as { new(...args: unknown[]): object });
  }

  validate(): void {
    // Validation logic to be implemented in future sprints
  }

  save(_adapter?: unknown): void {
    // Removed async to fix 'require-await'
    this.validate();
    // Save logic to be implemented
  }

  delete(_adapter?: unknown): void {
    // Delete logic to be implemented
  }
}
