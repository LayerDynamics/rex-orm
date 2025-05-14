import { defineMetadata, getMetadata } from "../deps.ts";

// Define context and source object types to avoid using any
export interface GraphQLContext {
  [key: string]: unknown;
}

export interface GraphQLSource {
  [key: string]: unknown;
}

export interface GraphQLInfo {
  [key: string]: unknown;
}

export interface FieldOptions {
  type: string;
  description?: string;
  nullable?: boolean;
  resolve?: (
    source: GraphQLSource, 
    args: Record<string, unknown>, 
    context: GraphQLContext, 
    info: GraphQLInfo
  ) => unknown;
  deprecationReason?: string;
  complexity?: number;
}

export function Field(options: FieldOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const fields = getMetadata("graphql:fields", target.constructor) || [];

    fields.push({
      propertyKey,
      ...options,
      name: propertyKey.toString(),
    });

    defineMetadata("graphql:fields", fields, target.constructor);
  };
}
