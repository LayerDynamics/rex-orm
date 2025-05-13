# Rex-ORM Benchmarks

This module provides comprehensive benchmarking for Rex-ORM to measure
performance across different operations and database adapters.

## Overview

The benchmarking system is designed to:

1. Measure performance of key ORM operations
2. Compare different database adapters
3. Track performance changes over time
4. Identify potential bottlenecks

## Benchmark Categories

The benchmarks are organized into the following categories:

- **CRUD Operations**: Basic create, read, update, and delete operations
- **Complex Queries**: More advanced query operations including joins,
  filtering, and aggregation
- **Bulk Operations**: Performance of bulk operations compared to individual
  operations
- **Database Adapters**: Comparison between SQLite and PostgreSQL adapters
- **Real-Time Sync**: Performance of the real-time synchronization system

## Running Benchmarks

### Run All Benchmarks

```bash
deno run --allow-net --allow-read --allow-write --allow-env benchmarks/run_benchmarks.ts
```

### Run Specific Benchmarks

You can filter which benchmarks to run using the `--only` and `--skip` options
with regular expressions:

```bash
# Run only CRUD benchmarks
deno run --allow-net --allow-read --allow-write --allow-env benchmarks/run_benchmarks.ts --only="CRUD:"

# Skip adapter comparison benchmarks
deno run --allow-net --allow-read --allow-write --allow-env benchmarks/run_benchmarks.ts --skip="Adapter:"
```

### Silence Console Output

```bash
deno run --allow-net --allow-read --allow-write --allow-env benchmarks/run_benchmarks.ts --silent
```

### Output Results as JSON

```bash
deno run --allow-net --allow-read --allow-write --allow-env benchmarks/run_benchmarks.ts --json
```

### Create or Update Baseline

```bash
deno run --allow-net --allow-read --allow-write --allow-env benchmarks/run_benchmarks.ts --json > benchmarks/baseline.json
```

## Interpreting Results

The benchmarking system provides several useful metrics:

- **Average Time**: Average execution time in milliseconds
- **Total Time**: Total execution time for all runs
- **Run Count**: Number of times each benchmark was executed
- **Comparison with Baseline**: Percentage difference from baseline performance

## Adding New Benchmarks

To add new benchmarks:

1. Create a new TypeScript file in the appropriate category directory
2. Import the `bench` function from Deno's testing module
3. Register your benchmark using the `bench` function
4. Import your new benchmark file in `run_benchmarks.ts`

Example:

```typescript
// benchmarks/custom/my_benchmark.ts
import { bench } from "https://deno.land/std/testing/bench.ts";

bench({
  name: "Custom: My new benchmark",
  runs: 10,
  func: function myBenchmark(b) {
    b.start();
    // Your code to benchmark
    b.stop();
  },
});
```

## Best Practices

1. **Isolation**: Each benchmark should clean up after itself to avoid affecting
   other benchmarks
2. **Multiple Runs**: Use the `runs` parameter to average results over multiple
   iterations
3. **Realistic Data**: Use realistic data sizes and operations that reflect
   real-world usage
4. **Baseline Comparison**: Regularly update the baseline after intentional
   performance changes
5. **CI Integration**: Run benchmarks in CI to catch performance regressions

## Debugging Benchmarks

If a benchmark is failing or producing unexpected results:

1. Run the specific benchmark in isolation using the `--only` flag
2. Remove the `--silent` flag to see all console output
3. Check the setup and cleanup phases of the benchmark
4. Verify that the database adapters are configured correctly
5. Inspect the error messages for clues about what's going wrong

## Performance Tracking

Keep track of performance over time by:

1. Storing baseline.json files in version control
2. Running benchmarks before and after significant changes
3. Reviewing benchmark results as part of code reviews
4. Setting performance budgets for critical operations
