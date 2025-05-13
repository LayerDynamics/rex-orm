// benchmarks/run_benchmarks.ts
import { parse } from "https://deno.land/std/flags/mod.ts";
import { Table } from "https://deno.land/x/cliffy@v1.0.0-rc.3/table/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.3/ansi/colors.ts";

// Import benchmark modules
import "./crud/basic_operations.ts";
import "./query/complex_queries.ts";
import "./bulk/bulk_operations.ts";
import "./adapters/adapters_comparison.ts";
import "./realtime/sync_performance.ts";
import "./real_world/use_cases.ts";
import "./graphql/schema_generation.ts";
import "./graphql/graph_bench.ts";

// Database configurations
export const dbConfigs = {
  sqlite: {
    database: "sqlite",
    databasePath: ":memory:",
  },
  postgres: {
    database: "postgres",
    databaseName: "rex_orm_benchmark",
    user: "rex_user",
    password: "rex_password",
    host: "localhost",
    port: 5432,
  },
};

// Benchmark result interface
export interface BenchmarkResult {
  name: string;
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
  category: string;
  operation: string;
}

// Global results collection
export const benchmarkResults: BenchmarkResult[] = [];

// Add result method (called by benchmark functions)
export function addResult(result: BenchmarkResult): void {
  benchmarkResults.push(result);
}

// Parse command line arguments
const args = parse(Deno.args, {
  boolean: ["silent", "json", "help", "report-only"],
  string: ["only", "skip", "db"],
  default: {
    silent: false,
    json: false,
    "report-only": false,
    db: "both", // "sqlite", "postgres", or "both"
  },
});

if (args.help) {
  console.log(`
  Rex-ORM Benchmarks

  Usage:
    deno run --allow-net --allow-read --allow-write --allow-env benchmarks/run_benchmarks.ts [options]

  Options:
    --silent            Run without console output
    --json              Output results as JSON
    --only=<pattern>    Run only benchmarks matching the pattern (regexp)
    --skip=<pattern>    Skip benchmarks matching the pattern (regexp)
    --db=<db>           Database to benchmark against: "sqlite", "postgres", or "both" (default)
    --report-only       Only generate the report, don't run benchmarks (uses existing results)
    --help              Show this help message
  `);
  Deno.exit(0);
}

// Load baseline results for comparison
async function loadBaseline(): Promise<Record<string, any>> {
  try {
    const baselineText = await Deno.readTextFile("./bench/baseline.json");
    return JSON.parse(baselineText);
  } catch {
    return { results: [] };
  }
}

// Find baseline result for a benchmark
function findBaselineResult(
  baseline: Record<string, any>,
  name: string,
): Record<string, any> | undefined {
  if (!baseline.results) return undefined;
  return baseline.results.find((result: any) => result.name === name);
}

// Generate the benchmark report
function generateReport(
  results: BenchmarkResult[],
  baseline?: Record<string, any>,
): void {
  // Group benchmarks by category
  const categories = [...new Set(results.map((r) => r.category))].sort();

  console.log("\n" + colors.bold.underline("REX-ORM BENCHMARK RESULTS") + "\n");

  for (const category of categories) {
    console.log(colors.bold.green(`\n${category} Benchmarks:`));

    const categoryResults = results.filter((r) => r.category === category);

    // Set up table
    const table = new Table()
      .header([
        "Operation",
        "SQLite (ms)",
        "PostgreSQL (ms)",
        "Difference",
        "vs Baseline SQLite",
        "vs Baseline PostgreSQL",
      ])
      .border(true);

    for (const result of categoryResults) {
      const sqliteTime = result.sqlite?.meanMs
        ? result.sqlite.meanMs.toFixed(2)
        : result.sqlite?.error
        ? colors.red("Error")
        : "N/A";

      const postgresTime = result.postgres?.meanMs
        ? result.postgres.meanMs.toFixed(2)
        : result.postgres?.error
        ? colors.red("Error")
        : "N/A";

      // Calculate difference percentage when both exist
      let difference = "N/A";
      if (result.sqlite?.meanMs && result.postgres?.meanMs) {
        const diff = ((result.postgres.meanMs / result.sqlite.meanMs) - 1) *
          100;
        const formattedDiff = diff.toFixed(1);
        difference = diff > 0
          ? colors.yellow(`+${formattedDiff}%`)
          : colors.green(`${formattedDiff}%`);
      }

      // Baseline comparisons
      let baselineSqlite = "N/A";
      let baselinePostgres = "N/A";

      if (baseline) {
        const baselineResult = findBaselineResult(baseline, result.name);

        if (baselineResult?.sqlite?.meanMs && result.sqlite?.meanMs) {
          const diff =
            ((result.sqlite.meanMs / baselineResult.sqlite.meanMs) - 1) * 100;
          const formattedDiff = diff.toFixed(1);
          baselineSqlite = diff > 0
            ? colors.yellow(`+${formattedDiff}%`)
            : colors.green(`${formattedDiff}%`);
        }

        if (baselineResult?.postgres?.meanMs && result.postgres?.meanMs) {
          const diff =
            ((result.postgres.meanMs / baselineResult.postgres.meanMs) - 1) *
            100;
          const formattedDiff = diff.toFixed(1);
          baselinePostgres = diff > 0
            ? colors.yellow(`+${formattedDiff}%`)
            : colors.green(`${formattedDiff}%`);
        }
      }

      table.push([
        result.operation,
        sqliteTime,
        postgresTime,
        difference,
        baselineSqlite,
        baselinePostgres,
      ]);
    }

    // Render table
    table.render();
  }

  // Summary statistics
  const sqliteResults = results.filter((r) => r.sqlite?.meanMs);
  const postgresResults = results.filter((r) => r.postgres?.meanMs);

  const sqliteAvg = sqliteResults.length
    ? sqliteResults.reduce((sum, r) => sum + r.sqlite!.meanMs, 0) /
      sqliteResults.length
    : 0;

  const postgresAvg = postgresResults.length
    ? postgresResults.reduce((sum, r) => sum + r.postgres!.meanMs, 0) /
      postgresResults.length
    : 0;

  console.log("\n" + colors.bold("Summary:"));
  console.log(`Total benchmarks: ${results.length}`);
  console.log(`SQLite benchmarks completed: ${sqliteResults.length}`);
  console.log(`PostgreSQL benchmarks completed: ${postgresResults.length}`);
  console.log(`Average SQLite execution time: ${sqliteAvg.toFixed(2)}ms`);
  console.log(`Average PostgreSQL execution time: ${postgresAvg.toFixed(2)}ms`);

  if (sqliteAvg && postgresAvg) {
    const overallDiff = ((postgresAvg / sqliteAvg) - 1) * 100;
    console.log(
      `Overall PostgreSQL vs SQLite difference: ${overallDiff > 0 ? "+" : ""}${
        overallDiff.toFixed(1)
      }%`,
    );
  }
}

// Run all registered benchmarks
async function main() {
  const baseline = await loadBaseline();
  console.log("Running Rex-ORM benchmarks...");

  const filter = args.only ? new RegExp(args.only) : undefined;
  const skip = args.skip ? new RegExp(args.skip) : undefined;

  // Determine which databases to benchmark
  const runSqlite = ["sqlite", "both"].includes(args.db);
  const runPostgres = ["postgres", "both"].includes(args.db);

  if (!args["report-only"]) {
    console.log(
      `Running benchmarks for: ${runSqlite ? "SQLite" : ""}${
        runSqlite && runPostgres ? " and " : ""
      }${runPostgres ? "PostgreSQL" : ""}`,
    );
  } else {
    console.log("Generating report from existing benchmark results...");
  }

  if (args["report-only"]) {
    // Just generate report from existing results
    generateReport(benchmarkResults, baseline);
  } else {
    console.log(
      "Benchmarks loaded. Use 'deno bench' command to run all benchmarks.",
    );
    console.log(
      "For example: deno bench --allow-net --allow-read --allow-write --allow-env",
    );

    if (filter) {
      console.log(`Only running benchmarks matching: ${filter}`);
    }

    if (skip) {
      console.log(`Skipping benchmarks matching: ${skip}`);
    }
  }

  // After running benchmarks, generate a report
  if (benchmarkResults.length > 0 && !args["report-only"]) {
    generateReport(benchmarkResults, baseline);
  }

  // Output JSON if requested
  if (args.json) {
    console.log(JSON.stringify(
      {
        results: benchmarkResults,
        totalExecutionTimeMs: benchmarkResults.reduce((sum, r) => {
          let total = 0;
          if (r.sqlite?.totalMs) total += r.sqlite.totalMs;
          if (r.postgres?.totalMs) total += r.postgres.totalMs;
          return sum + total;
        }, 0),
        timestamp: new Date().toISOString(),
        filtered: filter || skip ? true : false,
      },
      null,
      2,
    ));
  }
}

// Run the main function
if (import.meta.main) {
  main();
}
