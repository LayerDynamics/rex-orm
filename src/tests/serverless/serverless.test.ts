import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std/testing/asserts.ts";
import { parse } from "https://deno.land/std/yaml/mod.ts";
import { join } from "https://deno.land/std/path/mod.ts";

const serverlessConfigPath = join("src", "serverless", "serverless.yml");

Deno.test({
  name: "Serverless Configuration Tests",
  async fn(t) {
    const configContent = await Deno.readTextFile(serverlessConfigPath);
    const config = parse(configContent) as Record<string, any>;

    await t.step("validate basic configuration", () => {
      assertEquals(config.service, "rex-orm-service");
      assertEquals(config.provider.name, "aws");
      assertEquals(config.provider.runtime, "provided.al2");
    });

    await t.step("validate function configurations", () => {
      const { functions } = config;

      // GraphQL function
      assertStringIncludes(functions.graphql.handler, "graphqlHandler");
      assertEquals(functions.graphql.events.length, 2);

      // Realtime function
      assertStringIncludes(functions.realtime.handler, "realtimeHandler");
      assertEquals(functions.realtime.events.length, 3);
    });

    await t.step("validate environment variables", () => {
      const { environment } = config.provider;
      assertEquals(typeof environment.DATABASE_TYPE, "string");
      assertEquals(typeof environment.DATABASE_URL, "string");
      assertEquals(typeof environment.REALTIME_PORT, "string");
      assertEquals(typeof environment.GRAPHQL_PORT, "string");
    });

    await t.step("validate plugins", () => {
      assertEquals(
        config.plugins.includes("serverless-plugin-custom-runtime"),
        true,
      );
    });
  },
});
