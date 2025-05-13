// benchmarks/utils/db_utils.ts
import { DatabaseFactory } from "../../src/factory/DatabaseFactory.ts";
import { addResult, dbConfigs } from "../run_benchmarks.ts";
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.3/ansi/colors.ts";

// Extended database adapter with benchmark type tracking
export interface BenchAdapter {
  adapter: any;
  type: "sqlite" | "postgres";
}

// Benchmark result interface
interface BenchmarkResult {
  name: string;
  category: string;
  operation: string;
  sqlite?: {
    meanMs: number;
    totalMs: number;
    runsCount: number;
    error?: string;
  };
  postgres?: {
    meanMs: number;
    totalMs: number;
    runsCount: number;
    error?: string;
  };
}

// Try to get SQLite adapter for benchmarks
export async function tryGetSQLiteAdapter(): Promise<BenchAdapter | null> {
  try {
    const adapter = DatabaseFactory.createAdapter(dbConfigs.sqlite);
    await adapter.connect();
    return {
      adapter,
      type: "sqlite",
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(colors.red("Failed to connect to SQLite: ") + errorMessage);
    return null;
  }
}

// Try to get PostgreSQL adapter for benchmarks
export async function tryGetPostgresAdapter(): Promise<BenchAdapter | null> {
  try {
    const adapter = DatabaseFactory.createAdapter(dbConfigs.postgres);
    await adapter.connect();

    // Verify connection works
    await adapter.execute("SELECT 1");

    return {
      adapter,
      type: "postgres",
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      colors.red("Failed to connect to PostgreSQL: ") + errorMessage,
    );
    console.log(
      colors.yellow(
        "Hint: Make sure PostgreSQL is running and the database exists.",
      ),
    );
    console.log(
      colors.yellow(
        `Connection details: ${JSON.stringify(dbConfigs.postgres, null, 2)}`,
      ),
    );
    return null;
  }
}

// Run benchmark with both adapters
export async function runBenchmarkWithBothAdapters(
  benchmarkName: string,
  category: string,
  operation: string,
  benchmarkFn: (adapter: BenchAdapter) => Promise<void>,
): Promise<void> {
  // Record results for each adapter
  const result: BenchmarkResult = {
    name: benchmarkName,
    category,
    operation,
  };

  // Test with SQLite
  const startSqlite = performance.now();
  try {
    const sqliteAdapter = await tryGetSQLiteAdapter();
    if (sqliteAdapter) {
      let runsCount = 0;
      const startRun = performance.now();
      await benchmarkFn(sqliteAdapter);
      const endRun = performance.now();
      runsCount++;

      result.sqlite = {
        meanMs: endRun - startRun,
        totalMs: endRun - startRun,
        runsCount,
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error running ${benchmarkName} with SQLite: ${errorMessage}`,
    );
    result.sqlite = {
      meanMs: 0,
      totalMs: 0,
      runsCount: 0,
      error: errorMessage,
    };
  }
  const endSqlite = performance.now();

  // Test with PostgreSQL
  const startPostgres = performance.now();
  try {
    const postgresAdapter = await tryGetPostgresAdapter();
    if (postgresAdapter) {
      let runsCount = 0;
      const startRun = performance.now();
      await benchmarkFn(postgresAdapter);
      const endRun = performance.now();
      runsCount++;

      result.postgres = {
        meanMs: endRun - startRun,
        totalMs: endRun - startRun,
        runsCount,
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error running ${benchmarkName} with PostgreSQL: ${errorMessage}`,
    );
    result.postgres = {
      meanMs: 0,
      totalMs: 0,
      runsCount: 0,
      error: errorMessage,
    };
  }
  const endPostgres = performance.now();

  // Add result to global collection
  addResult(result);

  // Report progress
  const sqliteTime = result.sqlite?.meanMs
    ? `${result.sqlite.meanMs.toFixed(2)}ms`
    : result.sqlite?.error
    ? "Error"
    : "Skipped";

  const postgresTime = result.postgres?.meanMs
    ? `${result.postgres.meanMs.toFixed(2)}ms`
    : result.postgres?.error
    ? "Error"
    : "Skipped";

  console.log(
    `${benchmarkName} - SQLite: ${sqliteTime}, PostgreSQL: ${postgresTime}`,
  );
}

// Clean up adapter after benchmark
export async function cleanupAdapter(adapter: BenchAdapter): Promise<void> {
  if (!adapter || !adapter.adapter) return;

  try {
    await adapter.adapter.disconnect();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error during cleanup: ${errorMessage}`);
  }
}
