declare namespace Reflect {
  function defineMetadata(metadataKey: any, metadataValue: any, target: object): void;
  function defineMetadata(metadataKey: any, metadataValue: any, target: object, propertyKey: string | symbol): void;
  
  function getMetadata(metadataKey: any, target: object): any;
  function getMetadata(metadataKey: any, target: object, propertyKey: string | symbol): any;
  
  function hasMetadata(metadataKey: any, target: object): boolean;
  function hasMetadata(metadataKey: any, target: object, propertyKey: string | symbol): boolean;
}
