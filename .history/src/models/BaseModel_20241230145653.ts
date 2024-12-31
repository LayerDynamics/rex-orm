import { ModelRegistry } from "./ModelRegistry.ts";

export abstract class BaseModel {
  constructor() {
    // Cast constructor to a known type
    ModelRegistry.registerModel(this.constructor as { new(...args: unknown[]): object });
  }

  validate(): void {
    // Validation logic to be implemented in future sprints

  async save(adapter: any): Promise<void> {
    this.validate();
    // Save logic to be implemented
  }

  async delete(adapter: any): Promise<void> {
    // Delete logic to be implemented
  }
}
