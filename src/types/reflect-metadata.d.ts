declare namespace Reflect {
  // Use a more specific type instead of Function
  type Constructor<T = object> = new (...args: unknown[]) => T;
  
  function decorate(decorators: ClassDecorator[], target: Constructor): Constructor;
  function decorate(
    decorators: (PropertyDecorator | MethodDecorator)[],
    target: object,
    propertyKey: string | symbol,
    attributes?: PropertyDescriptor,
  ): PropertyDescriptor | undefined;

  function metadata(metadataKey: string | symbol, metadataValue: unknown): {
    (target: Constructor): void;
    (target: object, propertyKey: string | symbol): void;
  };

  function defineMetadata(
    metadataKey: string | symbol,
    metadataValue: unknown,
    target: object,
  ): void;
  function defineMetadata(
    metadataKey: string | symbol,
    metadataValue: unknown,
    target: object,
    propertyKey: string | symbol,
  ): void;

  function getMetadata(metadataKey: string | symbol, target: object): unknown;
  function getMetadata(
    metadataKey: string | symbol,
    target: object,
    propertyKey: string | symbol,
  ): unknown;

  function getOwnMetadata(metadataKey: string | symbol, target: object): unknown;
  function getOwnMetadata(
    metadataKey: string | symbol,
    target: object,
    propertyKey: string | symbol,
  ): unknown;

  function hasMetadata(metadataKey: string | symbol, target: object): boolean;
  function hasMetadata(
    metadataKey: string | symbol,
    target: object,
    propertyKey: string | symbol,
  ): boolean;

  function hasOwnMetadata(metadataKey: string | symbol, target: object): boolean;
  function hasOwnMetadata(
    metadataKey: string | symbol,
    target: object,
    propertyKey: string | symbol,
  ): boolean;

  function deleteMetadata(metadataKey: string | symbol, target: object): boolean;
  function deleteMetadata(
    metadataKey: string | symbol,
    target: object,
    propertyKey: string | symbol,
  ): boolean;

  function getMetadataKeys(target: object): Array<string | symbol>;
  function getMetadataKeys(target: object, propertyKey: string | symbol): Array<string | symbol>;

  function getOwnMetadataKeys(target: object): Array<string | symbol>;
  function getOwnMetadataKeys(
    target: object,
    propertyKey: string | symbol,
  ): Array<string | symbol>;
}

interface DecoratorFactory {
  (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): void;
}
