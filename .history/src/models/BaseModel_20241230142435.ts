import { ModelRegistry } from "./ModelRegistry.ts";

export abstract class BaseModel {
  constructor() {
    ModelRegistry.registerModel(this.constructor);
  }

  validate(): void {
    // Validation logic to be implemented in future sprints
  }

  async save(adapter: any): Promise<void> {
    this.validate();