// src/tests/helpers/GraphQLTestHelper.ts

import { GraphQLServerWrapper } from "../../graphql/GraphQLServer.ts";
import { GraphQLSchemaConfig } from "../../graphql/types.ts";
import { delay } from "https://deno.land/std@0.203.0/async/delay.ts";

export class GraphQLTestHelper {
  static readonly SERVER_STARTUP_TIMEOUT = 5000; // Increased from 2000ms
  static readonly SERVER_SHUTDOWN_TIMEOUT = 2000;

  static async waitForServer(
    url: string,
    timeout: number = this.SERVER_STARTUP_TIMEOUT,
  ): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(url);
        if (response.status === 404 || response.status === 400) {
          // Server is up but returning expected GraphQL "no query" error
          return;
        }
      } catch (error) {
        if (
          error instanceof TypeError && error.message.includes("fetch failed")
        ) {
          // Server not ready yet, wait and retry
          await delay(100);
          continue;
        }
        throw error;
      }
      await delay(100);
    }
    throw new Error(`Server failed to start within ${timeout}ms`);
  }

  static async startServer(
    server: GraphQLServerWrapper,
    port: number,
  ): Promise<void> {
    // Start server with proper error handling
    try {
      const serverPromise = server.start();
      const waitPromise = this.waitForServer(
        `http://localhost:${port}/graphql`,
      );

      await Promise.race([
        Promise.all([serverPromise, waitPromise]),
        delay(this.SERVER_STARTUP_TIMEOUT).then(() => {
          throw new Error("Server startup timed out");
        }),
      ]);
    } catch (error) {
      await this.stopServer(server);
      throw error;
    }
  }

  static async stopServer(server: GraphQLServerWrapper): Promise<void> {
    try {
      await Promise.race([
        server.stop(),
        delay(this.SERVER_SHUTDOWN_TIMEOUT).then(() => {
          throw new Error("Server shutdown timed out");
        }),
      ]);
    } catch (error) {
      console.error("Error stopping server:", error);
      throw error;
    }
  }

  static async withRunningServer<T>(
    server: GraphQLServerWrapper,
    port: number,
    testFn: () => Promise<T>,
  ): Promise<T> {
    await this.startServer(server, port);
    try {
      return await testFn();
    } finally {
      await this.stopServer(server);
    }
  }

  static validateSchemaConfig(config: GraphQLSchemaConfig): boolean {
    return config.types !== undefined &&
      config.queries !== undefined &&
      config.mutations !== undefined;
  }
}
