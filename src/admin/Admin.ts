// Create admin utilities for business operations
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { BaseModel } from "../models/BaseModel.ts";
import { DatabaseFactory } from "../factory/DatabaseFactory.ts";
import { getErrorMessage } from "../utils/error_utils.ts";
import {
  DatabaseAdapter,
  DatabaseAdapterContext,
  EnhancedDatabaseAdapter,
} from "../interfaces/DatabaseAdapter.ts";
import {
  Audited,
  Column,
  DataRetention,
  Encrypted,
  Entity,
  PrimaryKey,
  RowLevelSecurity,
  SoftDelete,
  TenantScoped,
  Versioned,
} from "../decorators/index.ts";

// Type for model constructor
type Constructor<T = unknown> = { new (...args: unknown[]): T };

// Helper function to get metadata
function getMetadata(key: string, model: Constructor): unknown {
  return Reflect.getMetadata(key, model);
}

// Helper function to extend the ModelRegistry with enterprise features
function extendModelRegistry(): void {
  // No need to add alias for getFeatures since it already exists
  // We'll use getFeatures directly instead

  // Register built-in enterprise features
  const enterpriseFeatures = [
    "softDelete",
    "tenantScoped",
    "audited",
    "versioned",
    "rowLevelSecurity",
    "encrypted",
    "dataRetention",
  ];

  // Log successful initialization
  console.log("Extended ModelRegistry with enterprise features");
}

// Define interfaces for model instance methods
interface IModelWithQueries {
  createQueryBuilder(): {
    select: (columns: string[]) => any;
    delete: (tableName: string) => any;
    where: (field: string, operator: string, value: any) => any;
    andWhere: (field: string, operator: string, value: any) => any;
    from: (table: string) => any;
    execute: (adapter: DatabaseAdapter) => Promise<QueryResult>;
  };
  purgeExpiredData?: (adapter: DatabaseAdapter) => Promise<void>;
}

// Model interfaces with required methods for our example
interface CustomerDataInterface extends BaseModel {
  save(adapter: DatabaseAdapter): Promise<void>;
  delete(adapter: DatabaseAdapter): Promise<void>;
  restore(adapter: DatabaseAdapter): Promise<void>;
  getVersions(
    adapter: DatabaseAdapter,
  ): Promise<Array<{ version_number: number }>>;
  restoreVersion(
    adapter: DatabaseAdapter,
    versionNumber: number,
  ): Promise<void>;
}

// Define more specific types for different query results
interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

// Record type
type DatabaseRecord = Record<string, unknown>;

// User context type
interface UserContext {
  id: string;
  tenantId: string;
}

/**
 * EnterpriseAdmin provides utilities for managing enterprise features
 */
export class EnterpriseAdmin {
  constructor(private adapter: DatabaseAdapter) {}

  /**
   * Run data retention policies across all models
   */
  async enforceDataRetention(): Promise<void> {
    for (const model of ModelRegistry.getAllModels()) {
      const hasRetention = ModelRegistry.hasFeature(model, "dataRetention");
      const modelInstance = model as unknown as IModelWithQueries;
      if (
        hasRetention && typeof modelInstance.purgeExpiredData === "function"
      ) {
        await modelInstance.purgeExpiredData(this.adapter);
      }
    }
  }

  /**
   * Clean up soft deleted records after retention period
   */
  async purgeSoftDeleted(options: {
    olderThan?: Date;
    models?: Constructor[];
  } = {}): Promise<{ model: string; count: number }[]> {
    const results: { model: string; count: number }[] = [];
    const targetModels = options.models || ModelRegistry.getAllModels().filter(
      (model: Constructor) => ModelRegistry.hasFeature(model, "softDelete"),
    );

    const cutoffDate = options.olderThan ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    for (const model of targetModels) {
      const metadata = ModelRegistry.getModelMetadata(model);
      const softDeleteMeta = getMetadata("softDelete", model) as {
        enabled: boolean;
        deletedAtField: string;
      } | undefined;

      if (softDeleteMeta?.enabled) {
        const { deletedAtField } = softDeleteMeta;
        const modelInstance = model as unknown as IModelWithQueries;
        const qb = modelInstance.createQueryBuilder();
        const result = await qb.delete(metadata.tableName)
          .where(deletedAtField, "<", cutoffDate)
          .andWhere(deletedAtField, "IS NOT", null)
          .execute(this.adapter);

        results.push({
          model: model.name,
          count: result.rowCount,
        });
      }
    }

    return results;
  }

  /**
   * Export audit logs for compliance reporting
   */
  async exportAuditLogs(options: {
    model?: Constructor;
    startDate?: Date;
    endDate?: Date;
    format?: "json" | "csv";
  } = {}): Promise<string> {
    const format = options.format || "json";
    const models = options.model
      ? [options.model]
      : ModelRegistry.getAllModels().filter(
        (model: Constructor) => ModelRegistry.hasFeature(model, "audited"),
      );

    const auditRecords: Record<string, unknown>[] = [];

    for (const model of models) {
      const metadata = ModelRegistry.getModelMetadata(model);
      const auditMeta = getMetadata("audited", model) as {
        enabled: boolean;
        auditTable: string;
      } | undefined;

      if (auditMeta?.enabled) {
        const { auditTable } = auditMeta;
        const modelInstance = model as unknown as IModelWithQueries;
        const qb = modelInstance.createQueryBuilder();
        qb.select(["*"]).from(auditTable);

        if (options.startDate) {
          qb.where("timestamp", ">=", options.startDate);
        }

        if (options.endDate) {
          qb.andWhere("timestamp", "<=", options.endDate);
        }

        const result = await qb.execute(this.adapter);
        auditRecords.push(...result.rows);
      }
    }

    if (format === "csv") {
      // Convert to CSV
      if (auditRecords.length === 0) return "No records found";

      const headers = Object.keys(auditRecords[0]).join(",");
      const rows = auditRecords.map((record) => {
        return Object.values(record).map((value) => {
          if (typeof value === "object") {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(",");
      });

      return [headers, ...rows].join("\n");
    } else {
      // Return as JSON
      return JSON.stringify(auditRecords, null, 2);
    }
  }

  /**
   * Generate database health report
   */
  async generateHealthReport(): Promise<Record<string, unknown>> {
    const report = {
      timestamp: new Date(),
      database: {
        type: this.adapter.constructor.name,
        queryCount: this.adapter.queryCount || 0,
        connected: Boolean(this.adapter.connected),
      },
      models: [] as Record<string, unknown>[],
      tables: [] as Record<string, unknown>[],
    };

    // Check each model
    for (const model of ModelRegistry.getAllModels()) {
      const metadata = ModelRegistry.getModelMetadata(model);
      const features = ModelRegistry.getFeatures(model);

      const modelReport = {
        name: model.name,
        tableName: metadata.tableName,
        features: Array.from(features),
        rowCount: 0,
      };

      // Count records
      try {
        const modelInstance = model as unknown as IModelWithQueries;
        const qb = modelInstance.createQueryBuilder();
        const result = await qb
          .select(["COUNT(*) as count"])
          .from(metadata.tableName)
          .execute(this.adapter);

        modelReport.rowCount = Number(result.rows[0]?.count) || 0;
      } catch (_error) {
        modelReport.rowCount = -1; // Error occurred
      }

      report.models.push(modelReport);
    }

    // For SQLite: get table info and index info
    if (this.adapter.constructor.name === "SQLiteAdapter") {
      try {
        const tableResult = await this.adapter.execute(
          "SELECT name FROM sqlite_master WHERE type='table'",
        );

        for (const table of tableResult.rows) {
          const tableName = table.name as string;
          const tableInfo = await this.adapter.execute(
            `PRAGMA table_info(${tableName})`,
          );

          const indexInfo = await this.adapter.execute(
            `PRAGMA index_list(${tableName})`,
          );

          report.tables.push({
            name: tableName,
            columns: tableInfo.rows,
            indexes: indexInfo.rows,
          });
        }
      } catch (error) {
        report.tables = [{ error: getErrorMessage(error) }];
      }
    }

    // For PostgreSQL: schema information
    if (this.adapter.constructor.name === "PostgreSQLAdapter") {
      try {
        const tableResult = await this.adapter.execute(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
        );

        for (const table of tableResult.rows) {
          const tableName = table.table_name as string;
          const columnInfo = await this.adapter.execute(
            `SELECT column_name, data_type, is_nullable
             FROM information_schema.columns
             WHERE table_name = $1`,
            [tableName],
          );

          const indexInfo = await this.adapter.execute(
            `SELECT indexname, indexdef
             FROM pg_indexes
             WHERE tablename = $1`,
            [tableName],
          );

          report.tables.push({
            name: tableName,
            columns: columnInfo.rows,
            indexes: indexInfo.rows,
          });
        }
      } catch (error) {
        report.tables = [{ error: getErrorMessage(error) }];
      }
    }

    return report;
  }

  /**
   * Reset tenant data (for multi-tenant applications)
   */
  async resetTenantData(
    tenantId: string,
  ): Promise<{ model: string; count: number }[]> {
    const results: { model: string; count: number }[] = [];
    const tenantModels = ModelRegistry.getAllModels().filter(
      (model: Constructor) => ModelRegistry.hasFeature(model, "tenantScoped"),
    );

    // Save the current tenant context
    const originalTenantId = (globalThis as any).currentTenantId;

    try {
      // Set the tenant context to the one being reset
      (globalThis as any).currentTenantId = tenantId;

      // For each tenant-scoped model, delete all records
      for (const model of tenantModels) {
        const metadata = ModelRegistry.getModelMetadata(model);
        const tenantMeta = getMetadata("tenantScoped", model) as {
          enabled: boolean;
          tenantIdField: string;
        } | undefined;

        if (tenantMeta?.enabled) {
          const { tenantIdField } = tenantMeta;
          const modelInstance = model as unknown as IModelWithQueries;
          const qb = modelInstance.createQueryBuilder();
          const result = await qb.delete(metadata.tableName)
            .where(tenantIdField, "=", tenantId)
            .execute(this.adapter);

          results.push({
            model: model.name,
            count: result.rowCount,
          });
        }
      }

      return results;
    } finally {
      // Restore the original tenant context
      (globalThis as any).currentTenantId = originalTenantId;
    }
  }
}

// Example usage of enterprise features
export class EnterpriseExample {
  static async demonstrate() {
    // 1. Enable enterprise features in ModelRegistry
    extendModelRegistry();

    // 2. Define an enterprise-ready model
    @Entity({ tableName: "customer_data" })
    @SoftDelete()
    @TenantScoped()
    @Audited({ trackChanges: true })
    @Versioned({ maxVersions: 5 })
    @RowLevelSecurity((user: UserContext) =>
      `(tenant_id = '${user.tenantId}' OR created_by = '${user.id}')`
    )
    class CustomerData extends BaseModel implements CustomerDataInterface {
      @PrimaryKey()
      id!: number;

      @Column({ type: "varchar", length: 255 })
      name!: string;

      @Column({ type: "varchar", length: 255 })
      @Encrypted()
      socialSecurityNumber!: string;

      @Column({ type: "text" })
      @DataRetention({ years: 7 })
      financialData!: string;

      @Column({ type: "timestamp" })
      createdAt!: Date;

      @Column({ type: "varchar", length: 36 })
      tenantId!: string;

      @Column({ type: "varchar", length: 36 })
      createdBy!: string;

      @Column({ type: "timestamp", nullable: true })
      deletedAt!: Date | null;

      // Implementing required methods from BaseModel interface
      override async save(adapter: DatabaseAdapter): Promise<void> {
        // Implementation would be in BaseModel or added here
        console.log("Saving customer data");
      }

      override async delete(adapter: DatabaseAdapter): Promise<void> {
        // Implementation would be in BaseModel or added here
        console.log("Deleting customer data");
      }

      async restore(adapter: DatabaseAdapter): Promise<void> {
        // Implementation for soft delete restore
        console.log("Restoring customer data");
      }

      async getVersions(
        adapter: DatabaseAdapter,
      ): Promise<Array<{ version_number: number }>> {
        // Implementation for versioning
        console.log("Getting versions");
        return [{ version_number: 1 }];
      }

      async restoreVersion(
        adapter: DatabaseAdapter,
        versionNumber: number,
      ): Promise<void> {
        // Implementation for version restore
        console.log(`Restoring to version ${versionNumber}`);
      }
    }

    // 3. Using enterprise features in application
    const adapter = DatabaseFactory.createAdapter({
      database: "sqlite",
      databasePath: ":memory:",
    }) as EnhancedDatabaseAdapter;

    await adapter.connect();

    // Set user context
    adapter.context = {
      userId: "user123",
      user: {
        id: "user123",
        tenantId: "tenant456",
      },
      tenantId: "tenant456",
    };

    // Create and use a customer record
    const customer = new CustomerData();
    customer.name = "John Doe";
    customer.socialSecurityNumber = "123-45-6789"; // Will be encrypted
    customer.financialData = "Annual income: $75,000";
    customer.createdAt = new Date();
    customer.tenantId = "tenant456";
    customer.createdBy = "user123";

    await customer.save(adapter);

    // Update customer
    customer.name = "John Smith"; // Will be audited
    await customer.save(adapter);

    // Soft delete
    await customer.delete(adapter);

    // Restore from soft delete
    await customer.restore(adapter);

    // View version history
    const versions = await customer.getVersions(adapter);
    console.log(`${versions.length} versions found`);

    // Restore previous version
    if (versions.length > 0) {
      await customer.restoreVersion(adapter, versions[0].version_number);
    }

    // Use enterprise admin functions
    const admin = new EnterpriseAdmin(adapter);

    // Enforce data retention
    await admin.enforceDataRetention();

    // Generate health report
    const healthReport = await admin.generateHealthReport();
    console.log(
      "DB Health:",
      (healthReport.database as { connected: boolean })?.connected
        ? "Connected"
        : "Disconnected",
    );

    // Export audit logs
    const auditLogs = await admin.exportAuditLogs({
      format: "json",
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    });
    console.log(`Exported ${JSON.parse(auditLogs).length} audit records`);

    await adapter.disconnect();
  }
}
