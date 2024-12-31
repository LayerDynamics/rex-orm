import "https://deno.land/x/reflect_metadata@v0.1.12-2/mod.ts";

type Constructor<T=unknown>={new(...args: unknown[]): T};

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
	target: {new(...args: unknown[]): unknown};
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
		// Ensure reflect-metadata is imported at the top of your file
		const tableName = Reflect.getMetadata("tableName", model.prototype);
		if (!tableName) {
			throw new Error(`Model ${model.name} is missing @Entity decorator with tableName.`);
		}
		const columns: ColumnMetadata[] = Reflect.getMetadata("columns", model.prototype) || [];
		if (columns.length === 0) {
			throw new Error(`Model ${model.name} has no columns defined.`);
		}

		const primaryKeyColumn = columns.find(col => col.options.primaryKey);
		if (!primaryKeyColumn) {
			throw new Error(`Model ${model.name} does not have a primary key defined.`);
		}

		const relations: RelationMetadata[] = Reflect.getMetadata("relations", model.prototype) || [];

		this.models.set(model,{
			tableName,
			columns,
			primaryKey: primaryKeyColumn.propertyKey,
			relations,
		});
	}
	static getModelMetadata(model: Constructor): ModelMetadata {
		const metadata=this.models.get(model);
		if(!metadata) {
			throw new Error(`Model ${model.name} is not registered.`);
		}
		return metadata;
	}

	static getAllModels(): Constructor[] {
		return Array.from(this.models.keys());
	}
}

