export { assertEquals, assertThrows } from "https://deno.land/std@0.182.0/testing/asserts.ts";
export { load } from "https://deno.land/std@0.182.0/dotenv/mod.ts";

// Import and initialize reflect-metadata
import "https://deno.land/x/reflect_metadata@v0.1.12-2/mod.ts";

declare global {
  interface Reflect {
    decorate(decorators: ClassDecorator[], target: Function): Function;
    defineMetadata(metadataKey: any, metadataValue: any, target: object): void;
    defineMetadata(metadataKey: any, metadataValue: any, target: object, propertyKey: string | symbol): void;
    getMetadata(metadataKey: any, target: object): any;
    getMetadata(metadataKey: any, target: object, propertyKey: string | symbol): any;
    hasMetadata(metadataKey: any, target: object): boolean;
    hasMetadata(metadataKey: any, target: object, propertyKey: string | symbol): boolean;
    metadata(metadataKey: any, metadataValue: any): {
      (target: Function): void;
      (target: object, propertyKey: string | symbol): void;
    };
  }
}