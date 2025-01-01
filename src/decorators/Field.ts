import { defineMetadata, getMetadata } from "../deps.ts";

export interface FieldOptions {
  type: string;
  description?: string;
  nullable?: boolean;
  resolve?: (source: any, args: any, context: any, info: any) => any;
  deprecationReason?: string;
  complexity?: number;
}

export function Field(options: FieldOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const fields = getMetadata("graphql:fields", target.constructor) || [];
    
    fields.push({
      propertyKey,
      ...options,
      name: propertyKey.toString()
    });

    defineMetadata("graphql:fields", fields, target.constructor);
  };
}
