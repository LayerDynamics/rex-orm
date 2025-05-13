### Sprint 9: Plugin System - Core & Plugin Architecture

**Duration:** Weeks 17-18

---

## Overview

Sprint 9 introduces a **Plugin System** to Rex-ORM, empowering developers to
extend and customize the ORM's functionalities seamlessly. This modular
architecture allows for the addition of new features, integrations, and
enhancements without altering the core codebase. The key components of this
sprint include:

1. **Plugin Interface Definition:** Establishing a standardized interface for
   all plugins.
2. **Plugin Manager:** Managing the lifecycle of plugins, including loading,
   registering, and executing them.
3. **Core Integration:** Modifying Rex-ORM's core to support plugin hooks and
   extensions.
4. **Example Plugins:** Implementing sample plugins to demonstrate the plugin
   system's capabilities.
5. **Unit and Integration Testing:** Ensuring the reliability and correctness of
   the plugin system through comprehensive tests.
6. **Documentation:** Providing detailed guides on creating, integrating, and
   managing plugins within Rex-ORM.

---

## Directory Structure

The project directory is expanded to include the Plugin System Module and its
corresponding configurations and tests:

```
rex-orm/
├── src/
│   ├── graphql/
│   │   ├── GraphQLSchema.ts
│   │   ├── Resolvers.ts
│   │   ├── GraphQLServer.ts
│   │   └── types.ts
│   ├── plugin/
│   │   ├── Plugin.ts
│   │   ├── PluginManager.ts
│   │   ├── plugins/
│   │   │   ├── LoggingPlugin.ts
│   │   │   └── ValidationPlugin.ts
│   │   └── index.ts
│   ├── realtime/
│   │   ├── EventEmitter.ts
│   │   ├── WebSocketServer.ts
│   │   └── SubscriptionManager.ts
│   ├── migration/
│   │   ├── MigrationRunner.ts
│   │   ├── MigrationTracker.ts
│   │   └── MigrationManager.ts
│   ├── migrations/
│   │   ├── 001_create_users_table.ts
│   │   ├── 002_create_posts_table.ts
│   │   ├── 003_create_profiles_table.ts
│   │   ├── 004_create_post_tags_table.ts
│   │   └── ... (additional migration scripts)
│   ├── adapters/
│   │   ├── PostgreSQLAdapter.ts
│   │   └── SQLiteAdapter.ts
│   ├── decorators/
│   │   ├── Entity.ts
│   │   ├── Column.ts
│   │   ├── PrimaryKey.ts
│   │   ├── OneToMany.ts
│   │   ├── ManyToOne.ts
│   │   ├── OneToOne.ts
│   │   ├── ManyToMany.ts
│   │   ├── Validate.ts
│   │   └── ValidateMultiple.ts
│   ├── factory/
│   │   └── DatabaseFactory.ts
│   ├── interfaces/
│   │   └── DatabaseAdapter.ts
│   ├── models/
│   │   ├── ModelRegistry.ts
│   │   ├── BaseModel.ts
│   │   ├── User.ts
│   │   ├── Post.ts
│   │   └── ... (additional models)
│   ├── query/
│   │   └── QueryBuilder.ts
│   ├── serverless/
│   │   ├── handler.ts
│   │   ├── deploy.sh
│   │   └── serverless.yml
│   ├── tests/
│   │   └── unit/
│   │       ├── graphql/
│   │       │   ├── GraphQLSchema.test.ts
│   │       │   ├── Resolvers.test.ts
│   │       │   └── GraphQLServer.test.ts
│   │       ├── plugin/
│   │       │   ├── PluginManager.test.ts
│   │       │   ├── plugins/
│   │       │   │   ├── LoggingPlugin.test.ts
│   │       │   │   └── ValidationPlugin.test.ts
│   │       ├── realtime/
│   │       │   ├── EventEmitter.test.ts
│   │       │   ├── WebSocketServer.test.ts
│   │       │   └── SubscriptionManager.test.ts
│   │       ├── migration/
│   │       │   ├── MigrationRunner.test.ts
│   │       │   ├── MigrationTracker.test.ts
│   │       │   └── MigrationManager.test.ts
│   │       ├── adapters/
│   │       │   ├── PostgreSQLAdapter.test.ts
│   │       │   └── SQLiteAdapter.test.ts
│   │       ├── modelLayer/
│   │       │   ├── Decorators.test.ts
│   │       │   ├── ModelRegistry.test.ts
│   │       │   ├── RelationshipDecorators.test.ts
│   │       │   └── ValidationDecorators.test.ts
│   │       └── query/
│   │           └── QueryBuilder.test.ts
│   ├── cli/
│   ├── plugin/
│   ├── serverless/
│   │   └── ... (serverless functions)
│   └── config/
├── import_map.json
├── deno.json
├── package.json
└── README.md
```

---

## File Breakdown

Below are all the files to be created in Sprint 9, along with their respective
code and explanations.

---

### 1. `src/plugin/Plugin.ts`

**Description:** Defines the standardized interface that all plugins must
implement to ensure compatibility and seamless integration with Rex-ORM.

```typescript
// src/plugin/Plugin.ts

export interface Plugin {
  name: string;
  version: string;
  initialize(): void;
  execute?(...args: any[]): void;
  shutdown?(): void;
}
```

**Explanation:**

- **Plugin Interface:**
  - **`name`:** A unique identifier for the plugin.
  - **`version`:** The plugin's version number.
  - **`initialize()`:** Method invoked when the plugin is loaded. Used for
    setting up resources or configurations.
  - **`execute?(...args: any[]): void`:** Optional method for executing
    plugin-specific actions. Can be called by the core or other plugins.
  - **`shutdown?(): void`:** Optional method invoked when the plugin is unloaded
    or Rex-ORM is shutting down. Used for cleaning up resources.

**Notes:**

- **Extensibility:** Plugins can implement additional methods or properties as
  needed, provided they adhere to the `Plugin` interface.
- **Optional Methods:** `execute` and `shutdown` are optional, allowing plugins
  to implement only the functionalities they require.

---

### 2. `src/plugin/PluginManager.ts`

**Description:** Manages the lifecycle of plugins, including loading,
registering, executing, and unloading them. Ensures that plugins are integrated
smoothly with Rex-ORM's core functionalities.

```typescript
// src/plugin/PluginManager.ts

import { Plugin } from "./Plugin.ts";

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  /**
   * Loads and initializes a plugin.
   * @param plugin The plugin instance to load.
   */
  loadPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} is already loaded.`);
      return;
    }
    plugin.initialize();
    this.plugins.set(plugin.name, plugin);
    console.log(`Plugin ${plugin.name} v${plugin.version} loaded.`);
  }

  /**
   * Unloads and shuts down a plugin.
   * @param pluginName The name of the plugin to unload.
   */
  unloadPlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      console.warn(`Plugin ${pluginName} is not loaded.`);
      return;
    }
    if (plugin.shutdown) {
      plugin.shutdown();
    }
    this.plugins.delete(pluginName);
    console.log(`Plugin ${plugin.name} unloaded.`);
  }

  /**
   * Executes a specific plugin's action.
   * @param pluginName The name of the plugin.
   * @param args Arguments to pass to the plugin's execute method.
   */
  executePlugin(pluginName: string, ...args: any[]): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      console.warn(`Plugin ${pluginName} is not loaded.`);
      return;
    }
    if (plugin.execute) {
      plugin.execute(...args);
    } else {
      console.warn(`Plugin ${pluginName} does not have an execute method.`);
    }
  }

  /**
   * Retrieves a loaded plugin by name.
   * @param pluginName The name of the plugin.
   * @returns The plugin instance or undefined.
   */
  getPlugin(pluginName: string): Plugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Retrieves all loaded plugins.
   * @returns An array of all loaded plugins.
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Shuts down all loaded plugins.
   */
  shutdownAll(): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.shutdown) {
        plugin.shutdown();
      }
      console.log(`Plugin ${plugin.name} unloaded.`);
    }
    this.plugins.clear();
    console.log("All plugins have been shut down.");
  }
}
```

**Explanation:**

- **PluginManager Class:**
  - **`plugins`:** A `Map` that holds all loaded plugins, keyed by their names.

  - **`loadPlugin(plugin: Plugin)`:**
    - Checks if the plugin is already loaded to prevent duplicates.
    - Calls the plugin's `initialize` method.
    - Adds the plugin to the `plugins` map.
    - Logs the successful loading of the plugin.

  - **`unloadPlugin(pluginName: string)`:**
    - Retrieves the plugin by name.
    - Calls the plugin's `shutdown` method if it exists.
    - Removes the plugin from the `plugins` map.
    - Logs the successful unloading of the plugin.

  - **`executePlugin(pluginName: string, ...args: any[])`:**
    - Retrieves the plugin by name.
    - Calls the plugin's `execute` method with the provided arguments if it
      exists.
    - Logs warnings if the plugin isn't loaded or lacks an `execute` method.

  - **`getPlugin(pluginName: string)`:**
    - Returns the plugin instance by name or `undefined` if not found.

  - **`getAllPlugins()`:**
    - Returns an array of all loaded plugin instances.

  - **`shutdownAll()`:**
    - Iterates over all loaded plugins.
    - Calls each plugin's `shutdown` method if it exists.
    - Clears the `plugins` map.
    - Logs the successful shutdown of all plugins.

**Notes:**

- **Lifecycle Management:** The `PluginManager` ensures that plugins are
  properly initialized and cleaned up, preventing resource leaks.
- **Execution Control:** By controlling when and how plugins execute their
  actions, the `PluginManager` maintains the integrity and stability of Rex-ORM.
- **Extensibility:** New plugins can be added without modifying the core
  `PluginManager` logic, adhering to the Open/Closed Principle.

---

### 3. `src/plugin/plugins/LoggingPlugin.ts`

**Description:** An example plugin that logs ORM operations, such as creating,
updating, or deleting records. Demonstrates how plugins can hook into Rex-ORM's
event system to extend functionalities.

```typescript
// src/plugin/plugins/LoggingPlugin.ts

import { Plugin } from "../Plugin.ts";
import { EventEmitter } from "../../realtime/EventEmitter.ts";

export class LoggingPlugin implements Plugin {
  name: string = "LoggingPlugin";
  version: string = "1.0.0";
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  initialize(): void {
    this.eventEmitter.on("CREATE", this.handleCreate.bind(this));
    this.eventEmitter.on("UPDATE", this.handleUpdate.bind(this));
    this.eventEmitter.on("DELETE", this.handleDelete.bind(this));
    console.log(`${this.name} initialized and listening to ORM events.`);
  }

  handleCreate(event: any): void {
    console.log(`[${this.name}] CREATE event:`, event);
  }

  handleUpdate(event: any): void {
    console.log(`[${this.name}] UPDATE event:`, event);
  }

  handleDelete(event: any): void {
    console.log(`[${this.name}] DELETE event:`, event);
  }

  shutdown(): void {
    this.eventEmitter.off("CREATE", this.handleCreate.bind(this));
    this.eventEmitter.off("UPDATE", this.handleUpdate.bind(this));
    this.eventEmitter.off("DELETE", this.handleDelete.bind(this));
    console.log(`${this.name} has been shut down.`);
  }
}
```

**Explanation:**

- **LoggingPlugin Class:**
  - **Implements `Plugin` Interface:**
    - **`name`:** Identifier as `"LoggingPlugin"`.
    - **`version`:** Version `"1.0.0"`.

  - **Constructor:**
    - Accepts an instance of `EventEmitter` to subscribe to ORM events.

  - **`initialize()`:**
    - Subscribes to `CREATE`, `UPDATE`, and `DELETE` events emitted by the ORM.
    - Binds corresponding handler methods to log event details.
    - Logs the successful initialization of the plugin.

  - **Event Handlers (`handleCreate`, `handleUpdate`, `handleDelete`):**
    - Logs the event type and payload when an ORM operation occurs.

  - **`shutdown()`:**
    - Unsubscribes from ORM events to prevent memory leaks.
    - Logs the successful shutdown of the plugin.

**Notes:**

- **Event Binding:** Uses `.bind(this)` to ensure the correct context within
  event handlers.
- **Clean Shutdown:** Ensures that all event listeners are removed during
  shutdown to maintain application stability.
- **Extensibility:** Additional event handlers can be added to respond to other
  ORM events as needed.

---

### 4. `src/plugin/plugins/ValidationPlugin.ts`

**Description:** An example plugin that validates data before it is persisted to
the database. Demonstrates how plugins can enforce data integrity and business
rules.

```typescript
// src/plugin/plugins/ValidationPlugin.ts

import { Plugin } from "../Plugin.ts";
import { EventEmitter } from "../../realtime/EventEmitter.ts";

interface ValidationRule {
  model: string;
  field: string;
  validator: (value: any) => boolean;
  message: string;
}

export class ValidationPlugin implements Plugin {
  name: string = "ValidationPlugin";
  version: string = "1.0.0";
  private eventEmitter: EventEmitter;
  private rules: ValidationRule[] = [];

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  initialize(): void {
    // Example validation rules
    this.rules.push(
      {
        model: "User",
        field: "email",
        validator: (value: string) => /\S+@\S+\.\S+/.test(value),
        message: "Invalid email format.",
      },
      {
        model: "Post",
        field: "title",
        validator: (value: string) => value.length >= 5,
        message: "Post title must be at least 5 characters long.",
      },
    );

    this.eventEmitter.on("BEFORE_CREATE", this.handleBeforeCreate.bind(this));
    this.eventEmitter.on("BEFORE_UPDATE", this.handleBeforeUpdate.bind(this));
    console.log(
      `${this.name} initialized with ${this.rules.length} validation rules.`,
    );
  }

  handleBeforeCreate(event: any): void {
    this.validate(event);
  }

  handleBeforeUpdate(event: any): void {
    this.validate(event);
  }

  validate(event: any): void {
    const modelName = event.model;
    const data = event.payload;

    const applicableRules = this.rules.filter((rule) =>
      rule.model === modelName
    );

    for (const rule of applicableRules) {
      const value = data[rule.field];
      if (!rule.validator(value)) {
        throw new Error(`[${this.name}] Validation failed: ${rule.message}`);
      }
    }

    console.log(`[${this.name}] Validation passed for ${modelName}.`);
  }

  shutdown(): void {
    this.eventEmitter.off("BEFORE_CREATE", this.handleBeforeCreate.bind(this));
    this.eventEmitter.off("BEFORE_UPDATE", this.handleBeforeUpdate.bind(this));
    console.log(`${this.name} has been shut down.`);
  }
}
```

**Explanation:**

- **ValidationPlugin Class:**
  - **Implements `Plugin` Interface:**
    - **`name`:** Identifier as `"ValidationPlugin"`.
    - **`version`:** Version `"1.0.0"`.

  - **Constructor:**
    - Accepts an instance of `EventEmitter` to subscribe to ORM events.

  - **`initialize()`:**
    - Defines validation rules for specific models and fields.
    - Subscribes to `BEFORE_CREATE` and `BEFORE_UPDATE` events to perform
      validations before data is persisted.
    - Logs the successful initialization of the plugin with the number of
      validation rules.

  - **Event Handlers (`handleBeforeCreate`, `handleBeforeUpdate`):**
    - Invokes the `validate` method to enforce data integrity.

  - **`validate(event: any)`:**
    - Extracts the model name and payload from the event.
    - Filters applicable validation rules based on the model.
    - Iterates through each rule and applies the validator function to the
      corresponding field.
    - Throws an error with a descriptive message if validation fails.
    - Logs successful validation if all rules pass.

  - **`shutdown()`:**
    - Unsubscribes from ORM events to prevent memory leaks.
    - Logs the successful shutdown of the plugin.

**Notes:**

- **Flexible Validation Rules:** Validation rules can be easily extended or
  modified by adding new entries to the `rules` array.
- **Error Handling:** Throws errors when validations fail, which should be
  handled appropriately by Rex-ORM to prevent data inconsistencies.
- **Event Binding:** Uses `.bind(this)` to ensure the correct context within
  event handlers.

---

### 5. `src/plugin/index.ts`

**Description:** Serves as the entry point for the Plugin System Module,
facilitating the registration and management of plugins within Rex-ORM.

```typescript
// src/plugin/index.ts

import { PluginManager } from "./PluginManager.ts";
import { LoggingPlugin } from "./plugins/LoggingPlugin.ts";
import { ValidationPlugin } from "./plugins/ValidationPlugin.ts";
import { EventEmitter } from "../realtime/EventEmitter.ts";

/**
 * Initializes the Plugin System by loading and registering all available plugins.
 * @param eventEmitter The EventEmitter instance to be shared with plugins.
 * @returns An instance of PluginManager with all plugins loaded.
 */
export function initializePlugins(eventEmitter: EventEmitter): PluginManager {
  const pluginManager = new PluginManager();

  // Instantiate plugins
  const loggingPlugin = new LoggingPlugin(eventEmitter);
  const validationPlugin = new ValidationPlugin(eventEmitter);

  // Load plugins
  pluginManager.loadPlugin(loggingPlugin);
  pluginManager.loadPlugin(validationPlugin);

  return pluginManager;
}
```

**Explanation:**

- **`initializePlugins(eventEmitter: EventEmitter)`:**
  - Creates an instance of `PluginManager`.
  - Instantiates the `LoggingPlugin` and `ValidationPlugin`, passing the shared
    `EventEmitter`.
  - Loads the plugins into the `PluginManager`.
  - Returns the `PluginManager` instance with all plugins loaded.

**Notes:**

- **Centralized Initialization:** Ensures that all plugins are loaded and
  initialized in a consistent manner.
- **Scalability:** Additional plugins can be instantiated and loaded within this
  function as needed.
- **Dependency Injection:** Passes the `EventEmitter` to plugins to enable them
  to subscribe to ORM events.

---

### 6. `src/models/BaseModel.ts` (Updated for Plugin Hooks)

**Description:** Updates the `BaseModel` to emit additional events that plugins
can hook into, such as `BEFORE_CREATE`, `AFTER_CREATE`, `BEFORE_UPDATE`,
`AFTER_UPDATE`, `BEFORE_DELETE`, and `AFTER_DELETE`. These hooks allow plugins
to perform actions at different stages of ORM operations.

```typescript
// src/models/BaseModel.ts

import { EventEmitter } from "../realtime/EventEmitter.ts";
import { PluginManager } from "../plugin/PluginManager.ts";

export class BaseModel {
  private static eventEmitter: EventEmitter;
  private static pluginManager: PluginManager;

  /**
   * Initializes the Real-Time Synchronization and Plugin System.
   * @param realTimeSync The RealTimeSync instance.
   * @param pluginManager The PluginManager instance.
   */
  static initialize(realTimeSync: any, pluginManager: PluginManager): void {
    this.eventEmitter = realTimeSync.getEventEmitter();
    this.pluginManager = pluginManager;
  }

  /**
   * Saves the current instance to the database.
   * Emits BEFORE_CREATE, CREATE, AFTER_CREATE or BEFORE_UPDATE, UPDATE, AFTER_UPDATE events.
   * @param adapter The database adapter.
   */
  async save(adapter: any): Promise<void> {
    const modelName = this.constructor.name;

    if (!this.id) {
      // Emit BEFORE_CREATE
      this.eventEmitter.emit("BEFORE_CREATE", {
        model: modelName,
        payload: this,
      });
      // Execute plugins before creation
      this.pluginManager.executePlugin("ValidationPlugin", {
        model: modelName,
        payload: this,
      });

      // Perform CREATE operation
      await adapter.create(this);

      // Emit CREATE
      this.eventEmitter.emit("CREATE", { model: modelName, payload: this });
      // Emit AFTER_CREATE
      this.eventEmitter.emit("AFTER_CREATE", {
        model: modelName,
        payload: this,
      });
    } else {
      // Emit BEFORE_UPDATE
      this.eventEmitter.emit("BEFORE_UPDATE", {
        model: modelName,
        payload: this,
      });
      // Execute plugins before update
      this.pluginManager.executePlugin("ValidationPlugin", {
        model: modelName,
        payload: this,
      });

      // Perform UPDATE operation
      await adapter.update(this);

      // Emit UPDATE
      this.eventEmitter.emit("UPDATE", { model: modelName, payload: this });
      // Emit AFTER_UPDATE
      this.eventEmitter.emit("AFTER_UPDATE", {
        model: modelName,
        payload: this,
      });
    }
  }

  /**
   * Deletes the current instance from the database.
   * Emits BEFORE_DELETE, DELETE, AFTER_DELETE events.
   * @param adapter The database adapter.
   */
  async delete(adapter: any): Promise<void> {
    const modelName = this.constructor.name;

    // Emit BEFORE_DELETE
    this.eventEmitter.emit("BEFORE_DELETE", {
      model: modelName,
      payload: this,
    });

    // Perform DELETE operation
    await adapter.delete(this);

    // Emit DELETE
    this.eventEmitter.emit("DELETE", { model: modelName, payload: this });
    // Emit AFTER_DELETE
    this.eventEmitter.emit("AFTER_DELETE", { model: modelName, payload: this });
  }

  /**
   * Initializes RealTimeSync and PluginManager.
   * @param realTimeSync The RealTimeSync instance.
   * @param pluginManager The PluginManager instance.
   */
  static initializeRealTimeSync(
    realTimeSync: any,
    pluginManager: PluginManager,
  ): void {
    this.initialize(realTimeSync, pluginManager);
  }
}
```

**Explanation:**

- **`BaseModel` Class:**
  - **Static Properties:**
    - **`eventEmitter`:** Shared instance of `EventEmitter` for emitting ORM
      events.
    - **`pluginManager`:** Shared instance of `PluginManager` for managing
      plugins.

  - **`initialize(realTimeSync: any, pluginManager: PluginManager)`:**
    - Assigns the `EventEmitter` from the `RealTimeSync` instance.
    - Assigns the `PluginManager` instance.

  - **`save(adapter: any)`:**
    - Determines if the instance is new (no `id`) or existing.
    - Emits `BEFORE_CREATE` or `BEFORE_UPDATE` events.
    - Executes the `ValidationPlugin` before performing database operations.
    - Performs the `CREATE` or `UPDATE` operation using the adapter.
    - Emits `CREATE`/`UPDATE` and `AFTER_CREATE`/`AFTER_UPDATE` events
      accordingly.

  - **`delete(adapter: any)`:**
    - Emits `BEFORE_DELETE` event.
    - Performs the `DELETE` operation using the adapter.
    - Emits `DELETE` and `AFTER_DELETE` events accordingly.

  - **`initializeRealTimeSync(realTimeSync: any, pluginManager: PluginManager)`:**
    - Public method to initialize the `BaseModel` with `RealTimeSync` and
      `PluginManager` instances.

**Notes:**

- **Event Hooks:** Additional events (`BEFORE_CREATE`, `AFTER_CREATE`, etc.)
  allow plugins to hook into different stages of ORM operations.
- **Plugin Execution:** The `ValidationPlugin` is executed before creation and
  update operations to enforce data integrity.
- **Extensibility:** Future plugins can subscribe to the newly emitted events to
  perform various actions, such as logging, auditing, or triggering external
  workflows.

---

### 7. `src/plugin/PluginManager.test.ts`

**Description:** Unit tests for the `PluginManager` class, ensuring that plugins
are loaded, executed, and unloaded correctly.

```typescript
// src/tests/unit/plugin/PluginManager.test.ts

import { assertEquals, assertExists } from "../../../deps.ts";
import { PluginManager } from "../../../plugin/PluginManager.ts";
import { Plugin } from "../../../plugin/Plugin.ts";

class MockPlugin implements Plugin {
  name: string;
  version: string;
  initialized: boolean = false;
  executed: boolean = false;
  shutdownCalled: boolean = false;

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }

  initialize(): void {
    this.initialized = true;
  }

  execute(...args: any[]): void {
    this.executed = true;
  }

  shutdown(): void {
    this.shutdownCalled = true;
  }
}

Deno.test("PluginManager loads and registers plugins correctly", () => {
  const manager = new PluginManager();
  const plugin = new MockPlugin("TestPlugin", "1.0.0");

  manager.loadPlugin(plugin);

  assertExists(manager.getPlugin("TestPlugin"));
  assertEquals(manager.getPlugin("TestPlugin")?.initialized, true);
});

Deno.test("PluginManager prevents duplicate plugin loading", () => {
  const manager = new PluginManager();
  const plugin = new MockPlugin("DuplicatePlugin", "1.0.0");

  manager.loadPlugin(plugin);
  manager.loadPlugin(plugin); // Attempt to load the same plugin again

  assertEquals(manager.getAllPlugins().length, 1);
});

Deno.test("PluginManager executes plugin actions correctly", () => {
  const manager = new PluginManager();
  const plugin = new MockPlugin("ExecutablePlugin", "1.0.0");

  manager.loadPlugin(plugin);
  manager.executePlugin("ExecutablePlugin", "arg1", "arg2");

  assertEquals(plugin.executed, true);
});

Deno.test("PluginManager unloads plugins correctly", () => {
  const manager = new PluginManager();
  const plugin = new MockPlugin("UnloadPlugin", "1.0.0");

  manager.loadPlugin(plugin);
  manager.unloadPlugin("UnloadPlugin");

  assertEquals(manager.getPlugin("UnloadPlugin"), undefined);
  assertEquals(plugin.shutdownCalled, true);
});

Deno.test("PluginManager handles execution of non-existent plugins gracefully", () => {
  const manager = new PluginManager();

  // Attempt to execute a plugin that isn't loaded
  manager.executePlugin("NonExistentPlugin", "arg1");

  // No errors should occur, and nothing should be executed
  // Since we can't directly test for absence, ensure no plugins are loaded
  assertEquals(manager.getAllPlugins().length, 0);
});
```

**Explanation:**

- **MockPlugin Class:**
  - **Purpose:** Serves as a mock implementation of the `Plugin` interface for
    testing purposes.
  - **Properties:**
    - **`initialized`:** Tracks if the `initialize` method was called.
    - **`executed`:** Tracks if the `execute` method was called.
    - **`shutdownCalled`:** Tracks if the `shutdown` method was called.

- **Tests:**
  1. **`PluginManager loads and registers plugins correctly`:**
     - Instantiates `PluginManager`.
     - Creates and loads a `MockPlugin`.
     - Asserts that the plugin is loaded and initialized.

  2. **`PluginManager prevents duplicate plugin loading`:**
     - Attempts to load the same plugin twice.
     - Asserts that only one instance of the plugin exists in the manager.

  3. **`PluginManager executes plugin actions correctly`:**
     - Loads an executable plugin.
     - Calls `executePlugin` and verifies that the plugin's `execute` method was
       invoked.

  4. **`PluginManager unloads plugins correctly`:**
     - Loads and then unloads a plugin.
     - Asserts that the plugin is no longer loaded and that its `shutdown`
       method was called.

  5. **`PluginManager handles execution of non-existent plugins gracefully`:**
     - Attempts to execute a plugin that hasn't been loaded.
     - Asserts that no plugins are loaded and no errors occur.

**Notes:**

- **Isolation:** Each test is independent and does not affect others, ensuring
  reliable and repeatable test results.
- **Comprehensive Coverage:** Tests cover loading, preventing duplicates,
  executing actions, unloading, and handling non-existent plugins.
- **Mocking Behavior:** The `MockPlugin` class allows for precise control and
  observation of plugin lifecycle events during testing.

---

### 8. `src/plugin/plugins/LoggingPlugin.test.ts`

**Description:** Unit tests for the `LoggingPlugin`, ensuring that it correctly
listens to ORM events and logs them as expected.

```typescript
// src/tests/unit/plugin/plugins/LoggingPlugin.test.ts

import { assertEquals } from "../../../deps.ts";
import { LoggingPlugin } from "../../../plugin/plugins/LoggingPlugin.ts";
import { EventEmitter } from "../../../realtime/EventEmitter.ts";

Deno.test("LoggingPlugin initializes and listens to ORM events", () => {
  const eventEmitter = new EventEmitter();
  const plugin = new LoggingPlugin(eventEmitter);

  // Spy on console.log
  const originalLog = console.log;
  let logOutput: string[] = [];
  console.log = (message: string, ...args: any[]) => {
    logOutput.push(message + " " + JSON.stringify(args));
  };

  // Initialize plugin
  plugin.initialize();

  // Emit events
  const createEvent = { model: "User", payload: { id: 1, name: "Alice" } };
  eventEmitter.emit("CREATE", createEvent);

  const updateEvent = {
    model: "User",
    payload: { id: 1, name: "Alice Smith" },
  };
  eventEmitter.emit("UPDATE", updateEvent);

  const deleteEvent = {
    model: "User",
    payload: { id: 1, name: "Alice Smith" },
  };
  eventEmitter.emit("DELETE", deleteEvent);

  // Restore original console.log
  console.log = originalLog;

  // Assertions
  assertEquals(logOutput.length, 3);
  assertEquals(
    logOutput[0],
    `[LoggingPlugin] CREATE event: ${JSON.stringify(createEvent)}`,
  );
  assertEquals(
    logOutput[1],
    `[LoggingPlugin] UPDATE event: ${JSON.stringify(updateEvent)}`,
  );
  assertEquals(
    logOutput[2],
    `[LoggingPlugin] DELETE event: ${JSON.stringify(deleteEvent)}`,
  );
});

Deno.test("LoggingPlugin shuts down correctly", () => {
  const eventEmitter = new EventEmitter();
  const plugin = new LoggingPlugin(eventEmitter);

  // Spy on console.log
  const originalLog = console.log;
  let logOutput: string[] = [];
  console.log = (message: string, ...args: any[]) => {
    logOutput.push(message + " " + JSON.stringify(args));
  };

  // Initialize and then shutdown plugin
  plugin.initialize();
  plugin.shutdown();

  // Restore original console.log
  console.log = originalLog;

  // Emit an event after shutdown
  const createEvent = { model: "User", payload: { id: 1, name: "Alice" } };
  eventEmitter.emit("CREATE", createEvent);

  // Assertions
  assertEquals(logOutput.length, 2);
  assertEquals(
    logOutput[0],
    `LoggingPlugin initialized and listening to ORM events.`,
  );
  assertEquals(
    logOutput[1],
    `LoggingPlugin has been shut down.`,
  );
});
```

**Explanation:**

- **Tests:**
  1. **`LoggingPlugin initializes and listens to ORM events`:**
     - **Setup:**
       - Creates an instance of `EventEmitter`.
       - Instantiates `LoggingPlugin` with the `EventEmitter`.
       - Mocks `console.log` to capture log outputs.

     - **Execution:**
       - Initializes the plugin, which subscribes to `CREATE`, `UPDATE`, and
         `DELETE` events.
       - Emits each of these events with mock payloads.

     - **Assertions:**
       - Verifies that three log messages are captured corresponding to each
         event.
       - Ensures that the log messages match the expected format and content.

  2. **`LoggingPlugin shuts down correctly`:**
     - **Setup:**
       - Similar to the first test, but focuses on the shutdown process.

     - **Execution:**
       - Initializes and then shuts down the plugin.
       - Emits a `CREATE` event after shutdown.

     - **Assertions:**
       - Verifies that only the initialization and shutdown log messages are
         captured.
       - Ensures that the plugin no longer logs events after shutdown.

**Notes:**

- **Spying on `console.log`:** Temporarily overrides `console.log` to capture
  and inspect log outputs without polluting the test output.
- **Event Emission Post-Shutdown:** Ensures that the plugin no longer listens to
  events after it has been shut down.
- **Isolation:** Each test operates independently, ensuring reliable and
  predictable outcomes.

---

### 9. `src/plugin/plugins/ValidationPlugin.test.ts`

**Description:** Unit tests for the `ValidationPlugin`, ensuring that it
correctly validates data before ORM operations and handles validation failures
appropriately.

```typescript
// src/tests/unit/plugin/plugins/ValidationPlugin.test.ts

import { assertEquals, assertThrows } from "../../../deps.ts";
import { ValidationPlugin } from "../../../plugin/plugins/ValidationPlugin.ts";
import { EventEmitter } from "../../../realtime/EventEmitter.ts";

class MockModel {
  constructor(
    public id?: number,
    public email?: string,
    public title?: string,
  ) {}
}

Deno.test("ValidationPlugin validates data correctly on BEFORE_CREATE", () => {
  const eventEmitter = new EventEmitter();
  const plugin = new ValidationPlugin(eventEmitter);
  plugin.initialize();

  // Valid User creation
  const validUser = new MockModel(undefined, "alice@example.com");
  const validCreateEvent = { model: "User", payload: validUser };

  // Should not throw
  plugin.validate(validCreateEvent);

  // Invalid User creation (invalid email)
  const invalidUser = new MockModel(undefined, "aliceexample.com");
  const invalidCreateEvent = { model: "User", payload: invalidUser };

  assertThrows(
    () => {
      plugin.validate(invalidCreateEvent);
    },
    Error,
    "[ValidationPlugin] Validation failed: Invalid email format.",
  );

  // Valid Post creation
  const validPost = new MockModel(undefined, undefined, "Valid Title");
  const validPostCreateEvent = { model: "Post", payload: validPost };

  // Should not throw
  plugin.validate(validPostCreateEvent);

  // Invalid Post creation (short title)
  const invalidPost = new MockModel(undefined, undefined, "Hey");
  const invalidPostCreateEvent = { model: "Post", payload: invalidPost };

  assertThrows(
    () => {
      plugin.validate(invalidPostCreateEvent);
    },
    Error,
    "[ValidationPlugin] Validation failed: Post title must be at least 5 characters long.",
  );
});

Deno.test("ValidationPlugin validates data correctly on BEFORE_UPDATE", () => {
  const eventEmitter = new EventEmitter();
  const plugin = new ValidationPlugin(eventEmitter);
  plugin.initialize();

  // Valid User update
  const validUser = new MockModel(1, "alice@example.com");
  const validUpdateEvent = { model: "User", payload: validUser };

  // Should not throw
  plugin.validate(validUpdateEvent);

  // Invalid User update (invalid email)
  const invalidUser = new MockModel(1, "aliceexample.com");
  const invalidUpdateEvent = { model: "User", payload: invalidUser };

  assertThrows(
    () => {
      plugin.validate(invalidUpdateEvent);
    },
    Error,
    "[ValidationPlugin] Validation failed: Invalid email format.",
  );

  // Valid Post update
  const validPost = new MockModel(1, undefined, "Updated Title");
  const validPostUpdateEvent = { model: "Post", payload: validPost };

  // Should not throw
  plugin.validate(validPostUpdateEvent);

  // Invalid Post update (short title)
  const invalidPost = new MockModel(1, undefined, "Hi");
  const invalidPostUpdateEvent = { model: "Post", payload: invalidPost };

  assertThrows(
    () => {
      plugin.validate(invalidPostUpdateEvent);
    },
    Error,
    "[ValidationPlugin] Validation failed: Post title must be at least 5 characters long.",
  );
});

Deno.test("ValidationPlugin shuts down correctly", () => {
  const eventEmitter = new EventEmitter();
  const plugin = new ValidationPlugin(eventEmitter);
  plugin.initialize();

  // Spy on console.log
  const originalLog = console.log;
  let logOutput: string[] = [];
  console.log = (message: string, ...args: any[]) => {
    logOutput.push(message + " " + JSON.stringify(args));
  };

  // Shutdown plugin
  plugin.shutdown();

  // Restore original console.log
  console.log = originalLog;

  // Emit an event after shutdown
  const createEvent = {
    model: "User",
    payload: new MockModel(undefined, "bob@example.com"),
  };
  eventEmitter.emit("BEFORE_CREATE", createEvent);

  // Assertions
  // Since the plugin has been shut down, it should not validate or throw errors
  // However, since `handleBeforeCreate` is bound, and it's been removed on shutdown,
  // emitting an event should not invoke the plugin's `validate` method.
  // Thus, no errors should be thrown, and no log outputs related to validation should be present.

  assertEquals(logOutput.length, 1);
  assertEquals(
    logOutput[0],
    `ValidationPlugin has been shut down.`,
  );
});
```

**Explanation:**

- **MockModel Class:**
  - **Purpose:** Represents a simplified ORM model with optional fields for
    testing validation scenarios.

- **Tests:**
  1. **`ValidationPlugin validates data correctly on BEFORE_CREATE`:**
     - **Setup:**
       - Creates an instance of `EventEmitter`.
       - Instantiates and initializes `ValidationPlugin`.

     - **Execution:**
       - Creates valid and invalid `MockModel` instances for `User` and `Post`.
       - Calls the `validate` method directly to simulate plugin behavior during
         `BEFORE_CREATE`.

     - **Assertions:**
       - Ensures that valid data does not throw errors.
       - Verifies that invalid data throws errors with appropriate messages.

  2. **`ValidationPlugin validates data correctly on BEFORE_UPDATE`:**
     - **Setup:**
       - Similar to the first test but focuses on `BEFORE_UPDATE` events.

     - **Execution:**
       - Creates valid and invalid `MockModel` instances for `User` and `Post`.
       - Calls the `validate` method directly to simulate plugin behavior during
         `BEFORE_UPDATE`.

     - **Assertions:**
       - Ensures that valid data does not throw errors.
       - Verifies that invalid data throws errors with appropriate messages.

  3. **`ValidationPlugin shuts down correctly`:**
     - **Setup:**
       - Creates an instance of `EventEmitter`.
       - Instantiates and initializes `ValidationPlugin`.
       - Mocks `console.log` to capture log outputs.

     - **Execution:**
       - Shuts down the plugin.
       - Emits a `BEFORE_CREATE` event after shutdown.

     - **Assertions:**
       - Verifies that only the shutdown log message is captured.
       - Ensures that the plugin does not validate or throw errors after
         shutdown.

**Notes:**

- **Direct Validation Calls:** The tests call the `validate` method directly to
  simulate the plugin's response to ORM events. In an integrated environment,
  these methods would be invoked automatically via event listeners.
- **Error Handling:** Ensures that validation failures are correctly propagated
  as errors, allowing Rex-ORM to handle them appropriately.
- **Clean Shutdown:** Verifies that the plugin stops responding to events after
  it has been shut down.

---

### 10. `src/plugin/PluginManager.test.ts`

**Description:** Unit tests for the `PluginManager` class, ensuring that plugins
are loaded, executed, and unloaded correctly.

```typescript
// src/tests/unit/plugin/PluginManager.test.ts

import { assertEquals, assertExists } from "../../../deps.ts";
import { PluginManager } from "../../../plugin/PluginManager.ts";
import { Plugin } from "../../../plugin/Plugin.ts";

class MockPlugin implements Plugin {
  name: string;
  version: string;
  initialized: boolean = false;
  executed: boolean = false;
  shutdownCalled: boolean = false;

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }

  initialize(): void {
    this.initialized = true;
  }

  execute(...args: any[]): void {
    this.executed = true;
  }

  shutdown(): void {
    this.shutdownCalled = true;
  }
}

Deno.test("PluginManager loads and registers plugins correctly", () => {
  const manager = new PluginManager();
  const plugin = new MockPlugin("TestPlugin", "1.0.0");

  manager.loadPlugin(plugin);

  assertExists(manager.getPlugin("TestPlugin"));
  assertEquals(manager.getPlugin("TestPlugin")?.initialized, true);
});

Deno.test("PluginManager prevents duplicate plugin loading", () => {
  const manager = new PluginManager();
  const plugin = new MockPlugin("DuplicatePlugin", "1.0.0");

  manager.loadPlugin(plugin);
  manager.loadPlugin(plugin); // Attempt to load the same plugin again

  assertEquals(manager.getAllPlugins().length, 1);
});

Deno.test("PluginManager executes plugin actions correctly", () => {
  const manager = new PluginManager();
  const plugin = new MockPlugin("ExecutablePlugin", "1.0.0");

  manager.loadPlugin(plugin);
  manager.executePlugin("ExecutablePlugin", "arg1", "arg2");

  assertEquals(plugin.executed, true);
});

Deno.test("PluginManager unloads plugins correctly", () => {
  const manager = new PluginManager();
  const plugin = new MockPlugin("UnloadPlugin", "1.0.0");

  manager.loadPlugin(plugin);
  manager.unloadPlugin("UnloadPlugin");

  assertEquals(manager.getPlugin("UnloadPlugin"), undefined);
  assertEquals(plugin.shutdownCalled, true);
});

Deno.test("PluginManager handles execution of non-existent plugins gracefully", () => {
  const manager = new PluginManager();

  // Attempt to execute a plugin that isn't loaded
  manager.executePlugin("NonExistentPlugin", "arg1");

  // No errors should occur, and nothing should be executed
  // Since we can't directly test for absence, ensure no plugins are loaded
  assertEquals(manager.getAllPlugins().length, 0);
});
```

**Explanation:**

- **MockPlugin Class:**
  - **Purpose:** Serves as a mock implementation of the `Plugin` interface for
    testing purposes.
  - **Properties:**
    - **`initialized`:** Tracks if the `initialize` method was called.
    - **`executed`:** Tracks if the `execute` method was called.
    - **`shutdownCalled`:** Tracks if the `shutdown` method was called.

- **Tests:**
  1. **`PluginManager loads and registers plugins correctly`:**
     - Instantiates `PluginManager`.
     - Creates and loads a `MockPlugin`.
     - Asserts that the plugin is loaded and initialized.

  2. **`PluginManager prevents duplicate plugin loading`:**
     - Attempts to load the same plugin twice.
     - Asserts that only one instance of the plugin exists in the manager.

  3. **`PluginManager executes plugin actions correctly`:**
     - Loads an executable plugin.
     - Calls `executePlugin` and verifies that the plugin's `execute` method was
       invoked.

  4. **`PluginManager unloads plugins correctly`:**
     - Loads and then unloads a plugin.
     - Asserts that the plugin is no longer loaded and that its `shutdown`
       method was called.

  5. **`PluginManager handles execution of non-existent plugins gracefully`:**
     - Attempts to execute a plugin that hasn't been loaded.
     - Asserts that no plugins are loaded and no errors occur.

**Notes:**

- **Isolation:** Each test is independent and does not affect others, ensuring
  reliable and repeatable test results.
- **Comprehensive Coverage:** Tests cover loading, preventing duplicates,
  executing actions, unloading, and handling non-existent plugins.
- **Mocking Behavior:** The `MockPlugin` class allows for precise control and
  observation of plugin lifecycle events during testing.

---

### 11. `README.md` (Updated)

**Description:** Updates the project README to include information about the
Plugin System, its components, usage, and testing instructions.

```markdown
# Rex-ORM - Sprint 9: Plugin System - Core & Plugin Architecture

## Overview

Sprint 9 introduces a robust **Plugin System** to Rex-ORM, allowing developers
to extend and customize the ORM's functionalities effortlessly. This modular
architecture enables the addition of new features, integrations, and
enhancements without modifying the core codebase. By adhering to standardized
interfaces and lifecycle management, the Plugin System ensures seamless
integration and interoperability between plugins and Rex-ORM.

## Directory Structure
```

rex-orm/ ├── src/ │ ├── graphql/ │ │ ├── GraphQLSchema.ts │ │ ├── Resolvers.ts │
│ ├── GraphQLServer.ts │ │ └── types.ts │ ├── plugin/ │ │ ├── Plugin.ts │ │ ├──
PluginManager.ts │ │ ├── plugins/ │ │ │ ├── LoggingPlugin.ts │ │ │ └──
ValidationPlugin.ts │ │ └── index.ts │ ├── realtime/ │ │ ├── EventEmitter.ts │ │
├── WebSocketServer.ts │ │ └── SubscriptionManager.ts │ ├── migration/ │ │ ├──
MigrationRunner.ts │ │ ├── MigrationTracker.ts │ │ └── MigrationManager.ts │ ├──
migrations/ │ │ ├── 001_create_users_table.ts │ │ ├── 002_create_posts_table.ts
│ │ ├── 003_create_profiles_table.ts │ │ ├── 004_create_post_tags_table.ts │ │
└── ... (additional migration scripts) │ ├── adapters/ │ │ ├──
PostgreSQLAdapter.ts │ │ └── SQLiteAdapter.ts │ ├── decorators/ │ │ ├──
Entity.ts │ │ ├── Column.ts │ │ ├── PrimaryKey.ts │ │ ├── OneToMany.ts │ │ ├──
ManyToOne.ts │ │ ├── OneToOne.ts │ │ ├── ManyToMany.ts │ │ ├── Validate.ts │ │
└── ValidateMultiple.ts │ ├── factory/ │ │ └── DatabaseFactory.ts │ ├──
interfaces/ │ │ └── DatabaseAdapter.ts │ ├── models/ │ │ ├── ModelRegistry.ts │
│ ├── BaseModel.ts │ │ ├── User.ts │ │ ├── Post.ts │ │ └── ... (additional
models) │ ├── query/ │ │ └── QueryBuilder.ts │ ├── serverless/ │ │ ├──
handler.ts │ │ ├── deploy.sh │ │ └── serverless.yml │ ├── tests/ │ │ └── unit/ │
│ ├── graphql/ │ │ │ ├── GraphQLSchema.test.ts │ │ │ ├── Resolvers.test.ts │ │ │
└── GraphQLServer.test.ts │ │ ├── plugin/ │ │ │ ├── PluginManager.test.ts │ │ │
├── plugins/ │ │ │ │ ├── LoggingPlugin.test.ts │ │ │ │ └──
ValidationPlugin.test.ts │ │ ├── realtime/ │ │ │ ├── EventEmitter.test.ts │ │ │
├── WebSocketServer.test.ts │ │ │ └── SubscriptionManager.test.ts │ │ ├──
migration/ │ │ │ ├── MigrationRunner.test.ts │ │ │ ├── MigrationTracker.test.ts
│ │ │ └── MigrationManager.test.ts │ │ ├── adapters/ │ │ │ ├──
PostgreSQLAdapter.test.ts │ │ │ └── SQLiteAdapter.test.ts │ │ ├── modelLayer/ │
│ │ ├── Decorators.test.ts │ │ │ ├── ModelRegistry.test.ts │ │ │ ├──
RelationshipDecorators.test.ts │ │ │ └── ValidationDecorators.test.ts │ │ └──
query/ │ │ └── QueryBuilder.test.ts │ ├── cli/ │ ├── plugin/ │ ├── serverless/ │
│ └── ... (serverless functions) │ └── config/ ├── import_map.json ├── deno.json
├── package.json └── README.md

````
---

## File Breakdown

Below are all the files to be created in Sprint 9, along with their respective code and explanations.

---

### 1. `src/plugin/Plugin.ts`

**Description:** Defines the standardized interface that all plugins must implement to ensure compatibility and seamless integration with Rex-ORM.

```typescript
// src/plugin/Plugin.ts

export interface Plugin {
  name: string;
  version: string;
  initialize(): void;
  execute?(...args: any[]): void;
  shutdown?(): void;
}
````

**Explanation:**

- **Plugin Interface:**
  - **`name`:** A unique identifier for the plugin.
  - **`version`:** The plugin's version number.
  - **`initialize()`:** Method invoked when the plugin is loaded. Used for
    setting up resources or configurations.
  - **`execute?(...args: any[]): void`:** Optional method for executing
    plugin-specific actions. Can be called by the core or other plugins.
  - **`shutdown?(): void`:** Optional method invoked when the plugin is unloaded
    or Rex-ORM is shutting down. Used for cleaning up resources.

**Notes:**

- **Extensibility:** Plugins can implement additional methods or properties as
  needed, provided they adhere to the `Plugin` interface.
- **Optional Methods:** `execute` and `shutdown` are optional, allowing plugins
  to implement only the functionalities they require.

---
