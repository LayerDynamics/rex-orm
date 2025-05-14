import { assertArrayIncludes, assertEquals } from "../../../deps.ts";
import { GraphQLSchemaGenerator } from "../../../graphql/GraphQLSchema.ts";
import { ModelRegistry } from "../../../models/ModelRegistry.ts";
import { Column, Entity as Model } from "../../../decorators/index.ts";
import * as graphql from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";
import "reflect-metadata";
import { Entity } from "../../../decorators/Entity.ts";
import { PrimaryKey } from "../../../decorators/PrimaryKey.ts";

// Example GraphQL Model
@Entity({ tableName: "graphql_users" })
class GraphQLUser {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  name!: string;

  @Column({ type: "varchar", length: 150, unique: true, nullable: false })
  email!: string;
}

// Register the model before tests
ModelRegistry.registerModel(GraphQLUser);

Deno.test({
  name: "GraphQLSchemaGenerator generates correct schema config",
  fn() {
    ModelRegistry.clear();

    @Model({ tableName: "test_users" })
    class TestUser {
      @Column({ type: "Int", primaryKey: true })
      id!: number;

      @Column({ type: "String" })
      name!: string;
    }

    @Model({ tableName: "test_posts" })
    class TestPost {
      @Column({ type: "Int", primaryKey: true })
      id!: number;

      @Column({ type: "String" })
      title!: string;

      @Column({ type: "String" })
      content!: string;
    }

    ModelRegistry.registerModel(TestUser);
    ModelRegistry.registerModel(TestPost);

    const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();

    // Verify basic structure
    assertEquals(typeof schemaConfig, "object");
    assertEquals(typeof schemaConfig.types, "object");
    assertEquals(typeof schemaConfig.queries, "object");
    assertEquals(typeof schemaConfig.mutations, "object");

    // Check types existence
    const typeKeys = Object.keys(schemaConfig.types);
    assertEquals(typeKeys.includes("TestUser"), true);
    assertEquals(typeKeys.includes("TestPost"), true);

    // Check that types are actual GraphQLObjectType instances
    assertEquals(
      schemaConfig.types["TestUser"] instanceof graphql.GraphQLObjectType,
      true,
    );
    assertEquals(
      schemaConfig.types["TestPost"] instanceof graphql.GraphQLObjectType,
      true,
    );

    // Get fields from types
    const userType = schemaConfig.types["TestUser"];
    const postType = schemaConfig.types["TestPost"];

    const userFields = Object.keys(userType.getFields());
    const postFields = Object.keys(postType.getFields());

    assertArrayIncludes(userFields, ["id", "name"]);
    assertArrayIncludes(postFields, ["id", "title", "content"]);

    // Check query names
    const queryKeys = Object.keys(schemaConfig.queries);
    assertEquals(queryKeys.includes("getTestUser"), true);
    assertEquals(queryKeys.includes("getTestPost"), true);

    // Check mutation names
    const mutationKeys = Object.keys(schemaConfig.mutations);
    assertEquals(mutationKeys.includes("createTestUser"), true);
    assertEquals(mutationKeys.includes("createTestPost"), true);
  },
});

Deno.test({
  name: "mutations are correctly configured",
  fn() {
    ModelRegistry.clear();

    @Model({ tableName: "users" })
    class User {
      @Column({ type: "Int", primaryKey: true })
      id!: number;

      @Column({ type: "String" })
      name!: string;
    }

    ModelRegistry.registerModel(User);

    const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();

    // Check mutation existence and structure
    assertEquals(typeof schemaConfig.mutations["createUser"], "object");
    assertEquals(typeof schemaConfig.mutations["updateUser"], "object");
    assertEquals(typeof schemaConfig.mutations["deleteUser"], "object");

    // Verify mutation structure
    const createUserMutation = schemaConfig.mutations["createUser"];
    assertEquals(
      createUserMutation.type instanceof graphql.GraphQLObjectType,
      true,
    );
    assertEquals("input" in createUserMutation.args, true);
    assertEquals(
      createUserMutation.args.input.type instanceof graphql.GraphQLNonNull,
      true,
    );
  },
});
