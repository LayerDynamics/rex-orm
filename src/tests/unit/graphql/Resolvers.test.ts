import { assertEquals, assertExists } from "../../../deps.ts";
import { ResolversGenerator } from "../../../graphql/Resolvers.ts";
import { GraphQLSchemaGenerator } from "../../../graphql/GraphQLSchema.ts";
import { ModelRegistry } from "../../../models/ModelRegistry.ts";
import { User } from "../../../models/User.ts";
import { Post } from "../../../models/Post.ts";

Deno.test("ResolversGenerator generates correct resolvers", () => {
  ModelRegistry.registerModel(User);
  ModelRegistry.registerModel(Post);

  const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();
  const resolvers = ResolversGenerator.generateResolvers(schemaConfig);

  // Query resolvers
  assertExists(resolvers.Query.getUser);
  assertEquals(typeof resolvers.Query.getUser, "function");
  assertExists(resolvers.Query.getPost);

  // Mutation resolvers
  assertExists(resolvers.Mutation.createUser);
  assertExists(resolvers.Mutation.createPost);
});
