import {assertEquals,assertExists} from "../../../deps.ts";
import * as graphql from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";
import {ModelRegistry} from "../../../models/ModelRegistry.ts";
import {User} from "../../../models/User.ts";
import {Post} from "../../../models/Post.ts";
import {GraphQLServerWrapper} from "../../../graphql/GraphQLServer.ts";
import {GraphQLSchemaConfig} from "../../../graphql/types.ts";
import {DatabaseAdapter} from "../../../interfaces/DatabaseAdapter.ts";

class MockDatabaseAdapter implements DatabaseAdapter {
	async connect() {}
	async disconnect() {}
	async execute(query: string,params?: any[]): Promise<any> {
		return {rows: [],rowCount: 0};
	}
	async beginTransaction() {}
	async commit() {}
	async rollback() {}
	async findById(model: any,id: any): Promise<any> {
		return null;
	}
	async findAll(model: any): Promise<any[]> {
		return [];
	}
}

Deno.test({
	name: "GraphQL Server Integration Tests",
	async fn(t) {
		// Set up test environment
		ModelRegistry.clear();
		ModelRegistry.registerModel(User);
		ModelRegistry.registerModel(Post);

		const schemaConfig: GraphQLSchemaConfig={
			types: {
				User: new graphql.GraphQLObjectType({
					name: 'User',
					fields: {
						id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)}
					}
				})
			},
			queries: {
				getUser: {
					type: new graphql.GraphQLObjectType({
						name: 'User',
						fields: {
							id: {type: graphql.GraphQLString}
						}
					}),
					args: {
						id: {type: graphql.GraphQLString}
					}
				}
			},
			mutations: {},
			subscriptions: {}
		};

		let server: GraphQLServerWrapper;

		// Server lifecycle tests
		await t.step("server starts and stops correctly",async () => {
			server=new GraphQLServerWrapper(
				schemaConfig,
				{adapter: new MockDatabaseAdapter()},
				{port: 4488}
			);

			const startPromise=server.start();
			await new Promise(resolve => setTimeout(resolve,100));

			assertEquals(server.isServerRunning(),true);

			await server.stop();
			assertEquals(server.isServerRunning(),false);
		});

		// Query execution tests
		await t.step("handles GraphQL queries",async () => {
			server=new GraphQLServerWrapper(
				schemaConfig,
				{adapter: new MockDatabaseAdapter()},
				{port: 4488}
			);

			const serverPromise=server.start();
			await new Promise(resolve => setTimeout(resolve,100));

			try {
				const query=`query { getUser(id: "1") { id } }`;
				const response=await fetch("http://localhost:4488/graphql",{
					method: "POST",
					headers: {"Content-Type": "application/json"},
					body: JSON.stringify({query})
				});

				const result=await response.json();
				assertEquals(result.data.getUser,null);
			} finally {
				await server.stop();
			}
		});

		// Error handling tests
		await t.step("handles malformed queries",async () => {
			server=new GraphQLServerWrapper(
				schemaConfig,
				{adapter: new MockDatabaseAdapter()},
				{port: 4488}
			);

			const serverPromise=server.start();
			await new Promise(resolve => setTimeout(resolve,100));

			try {
				const response=await fetch("http://localhost:4488/graphql",{
					method: "POST",
					headers: {"Content-Type": "application/json"},
					body: JSON.stringify({query: "invalid query"})
				});

				const result=await response.json();
				assertExists(result.errors);
			} finally {
				await server.stop();
			}
		});

		// CORS handling tests
		await t.step("handles CORS preflight requests",async () => {
			server=new GraphQLServerWrapper(
				schemaConfig,
				{adapter: new MockDatabaseAdapter()},
				{port: 4488}
			);

			const serverPromise=server.start();
			await new Promise(resolve => setTimeout(resolve,100));

			try {
				const response=await fetch("http://localhost:4488/graphql",{
					method: "OPTIONS",
					headers: {
						'Origin': 'http://localhost:3000',
						'Access-Control-Request-Method': 'POST'
					}
				});

				assertEquals(response.status,204);
				assertEquals(response.headers.get('Access-Control-Allow-Origin'),'*');
				assertEquals(response.headers.get('Access-Control-Allow-Methods'),'POST, GET, OPTIONS');
			} finally {
				await server.stop();
			}
		});
	},
	sanitizeOps: false,
	sanitizeResources: false
});