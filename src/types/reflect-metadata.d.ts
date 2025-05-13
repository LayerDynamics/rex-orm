declare namespace Reflect {
  function decorate(decorators: ClassDecorator[], target: Function): Function;
  function decorate(
    decorators: (PropertyDecorator | MethodDecorator)[],
    target: object,
    propertyKey: string | symbol,
    attributes?: PropertyDescriptor,
  ): PropertyDescriptor | undefined;

  function metadata(metadataKey: any, metadataValue: any): {
    (target: Function): void;
    (target: object, propertyKey: string | symbol): void;
  };

  function defineMetadata(
    metadataKey: any,
    metadataValue: any,
    target: object,
  ): void;
  function defineMetadata(
    metadataKey: any,
    metadataValue: any,
    target: object,
    propertyKey: string | symbol,
  ): void;

  function getMetadata(metadataKey: any, target: object): any;
  function getMetadata(
    metadataKey: any,
    target: object,
    propertyKey: string | symbol,
  ): any;

  function getOwnMetadata(metadataKey: any, target: object): any;
  function getOwnMetadata(
    metadataKey: any,
    target: object,
    propertyKey: string | symbol,
  ): any;

  function hasMetadata(metadataKey: any, target: object): boolean;
  function hasMetadata(
    metadataKey: any,
    target: object,
    propertyKey: string | symbol,
  ): boolean;

  function hasOwnMetadata(metadataKey: any, target: object): boolean;
  function hasOwnMetadata(
    metadataKey: any,
    target: object,
    propertyKey: string | symbol,
  ): boolean;

  function deleteMetadata(metadataKey: any, target: object): boolean;
  function deleteMetadata(
    metadataKey: any,
    target: object,
    propertyKey: string | symbol,
  ): boolean;

  function getMetadataKeys(target: object): any[];
  function getMetadataKeys(target: object, propertyKey: string | symbol): any[];

  function getOwnMetadataKeys(target: object): any[];
  function getOwnMetadataKeys(
    target: object,
    propertyKey: string | symbol,
  ): any[];
}

interface DecoratorFactory {
  (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): void;
}
