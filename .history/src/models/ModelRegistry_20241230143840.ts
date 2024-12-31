import "reflect-metadata";
import { MetadataKey } from "reflect-metadata";

type Constructor<T = any> = { new (...args: any[]): T };

interface ColumnOptions {
  primaryKey?: boolean;
  type?: string;
  nullable?: boolean;
  unique?: boolean;
}

interface ColumnMetadata {
  propertyKey: string;
  options: ColumnOptions;
}

interface RelationMetadata {
  type: string;
  target: { new(...args: unknown[]): unknown };
  inverse: (object: unknown) => unknown;
}

interface ModelMetadata {
	tableName: string;
	columns: ColumnMetadata[];
	primaryKey: string;
	relations: RelationMetadata[];
}
export class ModelRegistry {
	private static models: Map<Constructor,ModelMetadata>=new Map();

	static registerModel(model: Constructor) {
		const tableName=Reflect.getMetadata("tableName",model);
		if(!tableName) {
			throw new Error(`Model ${model.name} is missing @Entity decorator with tableName.`);
		}
		const columns: ColumnMetadata[]=Reflect.getMetadata("columns",model)||[];
		if(columns.length===0) {
			throw new Error(`Model ${model.name} has no columns defined.`);
		}

		const primaryKeyColumn=columns.find(col => col.options.primaryKey);
		if(!primaryKeyColumn) {
			throw new Error(`Model ${model.name} does not have a primary key defined.`);
		}

		const relations: RelationMetadata[]=Reflect.getMetadata("relations",model)||[];

		this.models.set(model,{
			tableName,
			columns,
			primaryKey: primaryKeyColumn.propertyKey,
			relations,
		});
	}
  static getModelMetadata(model: Constructor): ModelMetadata {
	const metadata = this.models.get(model);
	if (!metadata) {
	  throw new Error(`Model ${model.name} is not registered.`);
	}
	return metadata;
  }

  static getAllModels(): Constructor[] {
	return Array.from(this.models.keys());
  }
  }
export function Entity(options: { tableName: string }) {	
	return function (constructor: Constructor) {
		Reflect.defineMetadata("tableName", options.tableName, constructor);
		ModelRegistry.registerModel(constructor);
	};
}
