declare namespace Reflect {
  function decorate(decorators: ClassDecorator[], target: Function): Function;
  function decorate(
    decorators: (PropertyDecorator | MethodDecorator)[],
    target: object,
    propertyKey: string | symbol,
  
  function hasMetadata(metadataKey: any, target: object): boolean;
  function hasMetadata(metadataKey: any, target: object, propertyKey: string | symbol): boolean;
}
