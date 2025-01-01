import * as graphql from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";

export interface ColumnMetadata {
	type: string;
	nullable?: boolean;
	primaryKey?: boolean;
	unique?: boolean;
	options?: {
		type: string;
		length?: number;
		nullable?: boolean;
		unique?: boolean;
		primaryKey?: boolean;
	};
}

export interface GraphQLFieldConfig extends Omit<graphql.GraphQLFieldConfig<any,any>,'args'> {
	type: graphql.GraphQLOutputType;
	args: Record<string,GraphQLArgumentConfig>;  // Made non-optional
	resolve?: graphql.GraphQLFieldResolver<any,any>;
	description?: string;
	deprecationReason?: string;
	extensions?: Record<string,any>;
	astNode?: any;
}

export interface GraphQLArgumentConfig {
	type: graphql.GraphQLInputType;
	defaultValue?: any;
	description?: string;
	extensions?: Record<string,any>;
	astNode?: any;
}

export interface GraphQLType {
	name: string;
	description?: string;
	fields: Record<string,GraphQLFieldConfig>;
	interfaces?: graphql.GraphQLInterfaceType[];
	isTypeOf?: (source: any,context: any,info: graphql.GraphQLResolveInfo) => boolean;
	extensions?: Record<string,any>;
	astNode?: any;
}

export interface GraphQLSchemaConfig {
	types: Record<string,graphql.GraphQLObjectType>;
	queries: Record<string,GraphQLFieldConfig>;
	mutations: Record<string,GraphQLFieldConfig>;
	subscriptions?: Record<string,GraphQLFieldConfig>;
	directives?: graphql.GraphQLDirective[];
	extensions?: Record<string,any>;
	astNode?: any;
}

export interface GraphQLError {
	message: string;
	path?: ReadonlyArray<string|number>;
	locations?: ReadonlyArray<{line: number; column: number}>;
	extensions?: Record<string,any>;
	nodes?: ReadonlyArray<any>;
	source?: any;
	positions?: ReadonlyArray<number>;
	originalError?: Error&{
		extensions?: Record<string,any>;
	};
}

export interface GraphQLResponse {
	data?: Record<string,any>|null;
	errors?: ReadonlyArray<GraphQLError>;
	extensions?: Record<string,any>;
}

export interface GraphQLInputField {
	type: graphql.GraphQLInputType;
	defaultValue?: any;
	description?: string;
	extensions?: Record<string,any>;
	astNode?: any;
}

export interface QueryResult {
	rows: any[];
	rowCount: number;
	fields?: any[];
	command?: string;
	rowAsArray?: boolean;
}

export type Constructor<T=any>=new (...args: any[]) => T;

export interface GraphQLContext {
	[key: string]: any;
}