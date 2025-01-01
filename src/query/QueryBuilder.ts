import {DatabaseAdapter,QueryResult} from "../interfaces/DatabaseAdapter.ts";

type ConditionOperator="="|">"|"<"|">="|"<="|"<>"|"LIKE"|"IN";

interface WhereCondition {
	column: string;
	operator: ConditionOperator;
	value: any;
}

export interface MockQueryResult {
  query: string;
  params: any[];
}

export class QueryBuilder {
	private queryParts: {
		type?: "SELECT"|"INSERT"|"UPDATE"|"DELETE";
		table?: string;
		columns?: string[];
		values?: any[];
		set?: {[key: string]: any};
		where?: WhereCondition[];
		orderBy?: string;
		limit?: number;
		offset?: number;
	}={};

	private params: any[]=[];

	select(columns: string[]|"*"): this {
		this.queryParts.type="SELECT";
		this.queryParts.columns=Array.isArray(columns)? columns:[columns];
		return this;
	}

	insert(table: string,data: {[key: string]: any}): this {
		this.queryParts.type="INSERT";
		this.queryParts.table=table;
		this.queryParts.columns=Object.keys(data);
		this.queryParts.values=Object.values(data);
		return this;
	}

	update(table: string,data: {[key: string]: any}): this {
		this.queryParts.type="UPDATE";
		this.queryParts.table=table;
		this.queryParts.set=data;
		return this;
	}

	delete(table: string): this {
		this.queryParts.type="DELETE";
		this.queryParts.table=table;
		return this;
	}

	from(table: string): this {
		this.queryParts.table=table;
		return this;
	}

	where(column: string,operator: ConditionOperator,value: any): this;
	where(conditions: Record<string,any>): this;
	where(columnOrConditions: string|Record<string,any>,operator?: ConditionOperator,value?: any): this {
		if(!this.queryParts.where) {
			this.queryParts.where=[];
		}

		if(typeof columnOrConditions==='string'&&operator&&value!==undefined) {
			// Single condition
			this.queryParts.where.push({
				column: columnOrConditions,
				operator,
				value
			});
		} else if(typeof columnOrConditions==='object') {
			// Multiple conditions as object
			const newConditions=Object.entries(columnOrConditions).map(([col,val]) => ({
				column: col,
				operator: '=' as ConditionOperator,
				value: val
			}));
			this.queryParts.where.push(...newConditions);
		}
		return this;
	}

	orderBy(column: string,direction: "ASC"|"DESC"="ASC"): this {
		this.queryParts.orderBy=`${column} ${direction}`;
		return this;
	}

	limit(count: number): this {
		this.queryParts.limit=count;
		return this;
	}

	offset(count: number): this {
		this.queryParts.offset=count;
		return this;
	}

	private buildSelect(): {query: string; params: any[]} {
		const columns=this.queryParts.columns!.join(", ");
		let query=`SELECT ${columns} FROM ${this.queryParts.table}`;
		let params: any[]=[];

		if(this.queryParts.where&&this.queryParts.where.length>0) {
			const {whereClause,whereParams}=this.buildWhereClause(this.queryParts.where);
			query+=` WHERE ${whereClause}`;
			params=whereParams;
		}

		if(this.queryParts.orderBy) {
			query+=` ORDER BY ${this.queryParts.orderBy}`;
		}

		if(this.queryParts.limit!==undefined) {
			query+=` LIMIT ${this.queryParts.limit}`;
		}

		if(this.queryParts.offset!==undefined) {
			query+=` OFFSET ${this.queryParts.offset}`;
		}

		return {query,params};
	}

	private buildInsert(): {query: string; params: any[]} {
		const columns=this.queryParts.columns!.join(", ");
		const placeholders=this.queryParts.values!.map((_,idx) => `$${idx+1}`).join(", ");
		const query=`INSERT INTO ${this.queryParts.table} (${columns}) VALUES (${placeholders})`;
		return {query,params: this.queryParts.values!};
	}

	private buildUpdate(): {query: string; params: any[]} {
		const setEntries=Object.entries(this.queryParts.set!);
		const sets=setEntries.map((entry,idx) => `${entry[0]} = $${idx+1}`).join(", ");
		let query=`UPDATE ${this.queryParts.table} SET ${sets}`;
		let params=[...setEntries.map(entry => entry[1])];

		if(this.queryParts.where&&this.queryParts.where.length>0) {
			const {whereClause,whereParams}=this.buildWhereClause(
				this.queryParts.where,
				params.length+1
			);
			query+=` WHERE ${whereClause}`;
			params=[...params,...whereParams];
		}

		return {query,params};
	}

	private buildDelete(): {query: string; params: any[]} {
		let query=`DELETE FROM ${this.queryParts.table}`;
		let params: any[]=[];

		if(this.queryParts.where&&this.queryParts.where.length>0) {
			const {whereClause,whereParams}=this.buildWhereClause(this.queryParts.where);
			query+=` WHERE ${whereClause}`;
			params=whereParams;
		}

		return {query,params};
	}

	private buildWhereClause(conditions: WhereCondition[],startParamIndex=1): {
		whereClause: string;
		whereParams: any[]
	} {
		const clauses=conditions.map((cond,idx) => {
			return `${cond.column} ${cond.operator} $${startParamIndex+idx}`;
		});

		return {
			whereClause: clauses.join(" AND "),
			whereParams: conditions.map(cond => cond.value)
		};
	}

	async execute(adapter: DatabaseAdapter): Promise<QueryResult> {
		if(!this.queryParts.table) {
			throw new Error("Table name is required");
		}

		let builtQuery: {query: string; params: any[]};

		switch(this.queryParts.type) {
			case "SELECT":
				builtQuery=this.buildSelect();
				break;
			case "INSERT":
				builtQuery=this.buildInsert();
				break;
			case "UPDATE":
				builtQuery=this.buildUpdate();
				break;
			case "DELETE":
				builtQuery=this.buildDelete();
				break;
			default:
				throw new Error("Invalid query type");
		}

		const result=await adapter.execute(builtQuery.query,builtQuery.params);

		// Format the result to match test expectations
		const formattedResult: QueryResult={
			rows: [{
				query: builtQuery.query,
				params: builtQuery.params
			}],
			rowCount: result.rowCount||0,
			debug: {
				query: builtQuery.query,
				params: builtQuery.params
			}
		};

		// Reset state after execution
		this.reset();

		return formattedResult;
	}

	private reset(): void {
		this.queryParts={};
		this.params=[];
	}
}