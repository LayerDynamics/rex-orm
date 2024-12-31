import { ModelRegistry } from "./ModelRegistry.ts";

export abstract class BaseModel {
  constructor() {
    ModelRegistry.registerModel(this.constructor);
  }

  validate(): void {
    // Validation logic to be implemented in future sprints
  }

  save(_adapter: unknown): void {
    this.validate();
    // Save logic to be implemented
  }

  delete(_adapter: unknown): void {
    // Delete logic to be implemented
  }
}
