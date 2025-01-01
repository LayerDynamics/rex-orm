import { getMetadata } from "../deps.ts";
import { ColumnOptions } from "../decorators/Column.ts";

type Constructor<T=unknown>={new(...args: unknown[]): T};

export interface ColumnMetadata {
	propertyKey: string;
	options: ColumnOptions;
	type?: string;
}

interface RelationMetadata {
	type: string;
	targetName: string;
	inverse: (object: unknown) => unknown;
	joinTable?: string;
	propertyKey: string;
}

interface ModelMetadata {
	tableName: string;
	columns: ColumnMetadata[];
	primaryKey: string;
	relations: RelationMetadata[];
	validations: { [key: string]: ((value: any) => boolean | string)[] };
}
export class ModelRegistry {
	private static models: Map<Constructor,ModelMetadata>=new Map();
	private static pendingRelations: Map<string, RelationMetadata[]> = new Map();
	private static pendingValidations: Map<string, Array<{
		propertyKey: string,
		validator: (value: any) => boolean | string
	}>> = new Map();
	private static registeredModels: Map<string, any> = new Map();

	static registerModel(model: Constructor) {
		const tableName = getMetadata("tableName", model);
		if (!tableName) {
			throw new Error(`Model ${model.name} is missing @Entity decorator with tableName.`);
		}
		const columns: ColumnMetadata[] = getMetadata("columns", model) || [];
		if (columns.length === 0) {
			throw new Error(`Model ${model.name} has no columns defined.`);
		}

		const primaryKeyColumn = columns.find(col => col.options.primaryKey);
		if (!primaryKeyColumn) {
			throw new Error(`Model ${model.name} does not have a primary key defined.`);
		}

		const relations: RelationMetadata[] = getMetadata("relations", model.prototype) || [];
		const validations: { [key: string]: ((value: any) => boolean | string)[] } = {};

		const modelMetadata = {
			tableName,
			columns,
			primaryKey: primaryKeyColumn.propertyKey,
			relations,
			validations,
		};

		this.models.set(model, modelMetadata);

		// Process any pending relations for this model
		const pending = this.pendingRelations.get(model.name);
		if (pending) {
			pending.forEach(relation => {
				modelMetadata.relations.push(relation);
			});
			this.pendingRelations.delete(model.name);
		}

		// Process any pending validations for this model
		const pendingValidations = this.pendingValidations.get(model.name);
		if (pendingValidations) {
			pendingValidations.forEach(({propertyKey, validator}) => {
				if (!modelMetadata.validations[propertyKey]) {
					modelMetadata.validations[propertyKey] = [];
				}
				modelMetadata.validations[propertyKey].push(validator);
			});
			this.pendingValidations.delete(model.name);
		}
	}

	static registerRelation(model: Constructor, relation: RelationMetadata) {
		const metadata = this.models.get(model);
		if (!metadata) {
			// Store relation as pending if model not yet registered
			if (!this.pendingRelations.has(model.name)) {
				this.pendingRelations.set(model.name, []);
			}
			this.pendingRelations.get(model.name)!.push(relation);
			return;
		}
		metadata.relations.push(relation);
	}

	static registerValidation(model: Constructor, propertyKey: string, validator: (value: any) => boolean | string) {
		const metadata = this.models.get(model);
		if (!metadata) {
			// Store validation as pending if model not yet registered
			const modelName = model.name;
			if (!this.pendingValidations.has(modelName)) {
				this.pendingValidations.set(modelName, []);
			}
			this.pendingValidations.get(modelName)!.push({ propertyKey, validator });
			return;
		}
		if (!metadata.validations[propertyKey]) {
			metadata.validations[propertyKey] = [];
		}
		metadata.validations[propertyKey].push(validator);
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

	static resolveTarget(targetName: string): Constructor {
		for (const [constructor] of this.models.entries()) {
			if (constructor.name === targetName) {
				return constructor;
			}
		}
		throw new Error(`Could not resolve target class: ${targetName}`);
	}

	static registerModels(...models: Constructor[]) {
		for (const model of models) {
			this.registerModel(model);
		}
	}

	static clear() {
		this.models.clear();
		this.pendingRelations.clear();
		this.pendingValidations.clear();
	}

	static getRegisteredModels(): Map<string, any> {
		return this.registeredModels;
	}
}

