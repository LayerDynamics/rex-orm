import { ModelRegistry } from "./ModelRegistry.ts";
import { RealTimeSync } from "../realtime/index.ts";

export abstract class BaseModel {
  protected static realTimeSync: RealTimeSync;
  abstract id: number; // Change to abstract property

  constructor() {
    ModelRegistry.registerModel(this.constructor as { new(...args: any[]): BaseModel });
  }

  static initializeRealTimeSync(realTimeSync: RealTimeSync) {
    this.realTimeSync = realTimeSync;
  }

  validate(): void {
    const metadata = ModelRegistry.getModelMetadata(this.constructor as { new(...args: any[]): BaseModel });
    const validations = metadata.validations;
    for (const [property, validators] of Object.entries(validations)) {
      const value = (this as any)[property];
      for (const validator of validators) {
        const result = validator(value);
        if (result === false) {
          throw new Error(`Validation failed for property '${property}'.`);
        } else if (typeof result === "string") {
          throw new Error(`Validation failed for property '${property}': ${result}`);
        }
      }
    }
  }

  protected isNew(): boolean {
    return !this.id;
  }

  toJSON(): Record<string, any> {
    const json: Record<string, any> = {};
    const metadata = ModelRegistry.getModelMetadata(this.constructor as { new(...args: any[]): BaseModel });
    for (const column of metadata.columns) {
      json[column.propertyKey] = (this as any)[column.propertyKey];
    }
    return json;
  }

  async save(adapter: any): Promise<void> {
    this.validate();
    // Save logic (insert or update)
    const eventType = this.isNew() ? "CREATE" : "UPDATE";
    const eventPayload = this.toJSON();
    BaseModel.realTimeSync.getEventEmitter().emit({
      type: eventType,
      payload: eventPayload,
    });
  }

  async delete(adapter: any): Promise<void> {
    // Delete logic
    const eventPayload = this.toJSON();
    BaseModel.realTimeSync.getEventEmitter().emit({
      type: "DELETE",
      payload: eventPayload,
    });
  }
}
