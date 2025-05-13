import "reflect-metadata"; // Added
import { assertEquals, assertExists } from "../../../deps.ts";
import { ResolversGenerator } from "../../../graphql/Resolvers.ts";
import { GraphQLSchemaGenerator } from "../../../graphql/GraphQLSchema.ts";
import { ModelRegistry } from "../../../models/ModelRegistry.ts";
import { User } from "../../../models/User.ts";
import { Post } from "../../../models/Post.ts";
import { Entity } from "../../../decorators/Entity.ts";
import { Column } from "../../../decorators/Column.ts";
import { PrimaryKey } from "../../../decorators/PrimaryKey.ts";

// Example Resolver Model
@Entity({ tableName: "resolver_users" })
class ResolverUser {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  resolverName!: string;

  @Column({ type: "varchar", length: 150, unique: true, nullable: false })
  resolverEmail!: string;
}

// Register the model before tests
ModelRegistry.registerModel(ResolverUser);

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
