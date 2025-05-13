// src/decorators/EnterpriseDecorators.ts

import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { defineMetadata, getMetadata } from "../deps.ts";
import { EncryptionService } from "../services/EncryptionService.ts";

/**
 * Options for configuring field encryption
 */
export interface EncryptionOptions {
  /** The encryption algorithm to use (default: "AES-GCM") */
  algorithm?: "AES-GCM" | "AES-CBC";

  /** Where to source the encryption key from (default: "env") */
  keySource?: "env" | "config" | "keyResolver";

  /** Name of environment variable containing the encryption key (when keySource="env") */
  keyEnvVar?: string;

  /** Custom key resolver function (when keySource="keyResolver") */
  keyResolver?: () => Promise<CryptoKey>;

  /** Encryption key length in bits (default: 256) */
  keyLength?: 128 | 192 | 256;

  /** Configuration path to the encryption key (when keySource="config") */
  keyConfig?: string;
}

/**
 * Interface for the metadata stored for encrypted fields
 */
interface EncryptedFieldMetadata {
  algorithm: "AES-GCM" | "AES-CBC";
  keyLength: 128 | 192 | 256;
  fields: string[];
}

/**
 * Field decorator that enables automatic encryption/decryption of sensitive data
 *
 * Usage:
 * ```typescript
 * @Entity({ tableName: "users" })
 * class User extends BaseModel {
 *   @Column({ type: "text" })
 *   @Encrypted({ algorithm: "AES-GCM", keyEnvVar: "USER_ENCRYPTION_KEY" })
 *   ssn!: string;
 * }
 * ```
 *
 * @param options Configuration options for the encryption
 * @returns Property decorator function
 */
export function Encrypted(options: EncryptionOptions = {}) {
  return function (target: object, propertyKey: string) {
    const algorithm = options.algorithm || "AES-GCM";
    const keyLength = options.keyLength || 256;
    const keySource = options.keySource || "env";
    const keyEnvVar = options.keyEnvVar || "ENCRYPTION_KEY";
    const keyConfig = options.keyConfig || "encryption.key";

    // Register the field as encrypted in class metadata
    if (!getMetadata("encryptedFields", target.constructor)) {
      defineMetadata("encryptedFields", {
        algorithm,
        keyLength,
        fields: [],
      } as EncryptedFieldMetadata, target.constructor);
    }

    const encryptedFields = getMetadata(
      "encryptedFields",
      target.constructor,
    ) as EncryptedFieldMetadata;
    if (!encryptedFields.fields.includes(propertyKey)) {
      encryptedFields.fields.push(propertyKey);
    }
    defineMetadata("encryptedFields", encryptedFields, target.constructor);

    // Create a symbol for storing the encrypted value
    const encryptedSymbol = Symbol(`encrypted_${propertyKey}`);

    // Define getters and setters for transparent encryption/decryption
    Object.defineProperty(target, propertyKey, {
      configurable: true,
      enumerable: true,
      get: function () {
        return this[encryptedSymbol];
      },
      set: function (value) {
        this[encryptedSymbol] = value;
      },
    });

    // Create encryption service
    const encryptionService = new EncryptionService({
      algorithm,
      keyLength,
      keySource,
      keyEnvVar,
      keyResolver: options.keyResolver,
      keyConfig,
    });

    // Override model toJSON to handle encryption before serialization
    const originalToJSON = target.constructor.prototype.toJSON;
    target.constructor.prototype.toJSON = function (): Record<string, unknown> {
      const json = originalToJSON.call(this);

      // Only encrypt if the field has a value and isn't already encrypted
      if (
        this[propertyKey] !== undefined &&
        this[propertyKey] !== null &&
        !EncryptionService.isEncryptedData(this[propertyKey])
      ) {
        try {
          // Mark as encrypted for async processing
          json[propertyKey] = `__NEEDS_ENCRYPTION__${this[propertyKey]}`;
        } catch (error: unknown) {
          console.error(
            `Failed to mark ${propertyKey} for encryption:`,
            error instanceof Error ? error.message : String(error),
          );
          throw new Error(
            `Encryption preparation failed for ${propertyKey}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      return json;
    };

    // Add async toJSON for when actual encryption is needed
    if (!target.constructor.prototype.toJSONAsync) {
      target.constructor.prototype.toJSONAsync = async function (): Promise<
        Record<string, unknown>
      > {
        const json = this.toJSON();

        const encryptedFields = getMetadata(
          "encryptedFields",
          this.constructor,
        ) as EncryptedFieldMetadata;
        if (!encryptedFields) return json;

        // Process each field marked for encryption
        const promises: Promise<void>[] = [];

        for (const [key, value] of Object.entries(json)) {
          if (
            typeof value === "string" &&
            value.startsWith("__NEEDS_ENCRYPTION__")
          ) {
            const actualValue = value.substring("__NEEDS_ENCRYPTION__".length);

            promises.push((async () => {
              try {
                const encryptedData = await encryptionService.encrypt(
                  actualValue,
                );
                json[key] = JSON.stringify(encryptedData);
              } catch (error: unknown) {
                console.error(
                  `Failed to encrypt ${key}:`,
                  error instanceof Error ? error.message : String(error),
                );
                throw new Error(
                  `Encryption failed for ${key}: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                );
              }
            })());
          }
        }

        await Promise.all(promises);
        return json;
      };
    }

    // Override fromJSON to handle decryption during deserialization
    const originalFromJSON = target.constructor.prototype.fromJSON;
    target.constructor.prototype.fromJSON = function (
      json: Record<string, unknown>,
    ): unknown {
      // First call the original method to set all normal properties
      const result = originalFromJSON.call(this, json);

      // Check if we need to decrypt this field
      if (json[propertyKey] && typeof json[propertyKey] === "string") {
        try {
          // Add to a queue for async decryption later
          if (EncryptionService.isEncryptedData(json[propertyKey] as string)) {
            this[`__encrypted_${propertyKey}`] = json[propertyKey];
            // Set a placeholder until properly decrypted
            this[propertyKey] = "[ENCRYPTED]";
          }
        } catch (error) {
          console.error(
            `Error preparing field ${propertyKey} for decryption:`,
            error,
          );
        }
      }

      return result;
    };

    // Add async fromJSON for when actual decryption is needed
    if (!target.constructor.prototype.fromJSONAsync) {
      target.constructor.prototype.fromJSONAsync = async function (
        json: Record<string, unknown>,
      ): Promise<unknown> {
        // First do the regular deserialization
        this.fromJSON(json);

        const encryptedFields = getMetadata(
          "encryptedFields",
          this.constructor,
        ) as EncryptedFieldMetadata;
        if (!encryptedFields) return this;

        const promises: Promise<void>[] = [];

        // Process all encrypted fields that need decryption
        for (const field of encryptedFields.fields) {
          if (this[`__encrypted_${field}`]) {
            promises.push((async () => {
              try {
                const encryptedJson = this[`__encrypted_${field}`] as string;
                const encrypted = JSON.parse(encryptedJson);
                const decrypted = await encryptionService.decrypt(encrypted);
                this[field] = decrypted;
                delete this[`__encrypted_${field}`];
              } catch (error: unknown) {
                console.error(
                  `Failed to decrypt ${field}:`,
                  error instanceof Error ? error.message : String(error),
                );
                throw new Error(
                  `Decryption failed for ${field}: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                );
              }
            })());
          }
        }

        await Promise.all(promises);
        return this;
      };
    }

    // Method to explicitly encrypt all fields (for immediate encryption)
    if (!target.constructor.prototype.encryptFields) {
      target.constructor.prototype.encryptFields = async function (): Promise<
        void
      > {
        const encryptedFields = getMetadata(
          "encryptedFields",
          this.constructor,
        ) as EncryptedFieldMetadata;
        if (!encryptedFields) return;

        for (const field of encryptedFields.fields) {
          if (this[field] && !EncryptionService.isEncryptedData(this[field])) {
            try {
              const fieldService = new EncryptionService({
                algorithm: encryptedFields.algorithm,
                keyLength: encryptedFields.keyLength,
                keySource,
                keyEnvVar,
                keyResolver: options.keyResolver,
                keyConfig,
              });

              const encrypted = await fieldService.encrypt(String(this[field]));
              this[`__encrypted_${field}`] = JSON.stringify(encrypted);
              this[field] = "[ENCRYPTED]";
            } catch (error: unknown) {
              console.error(
                `Failed to encrypt ${field}:`,
                error instanceof Error ? error.message : String(error),
              );
              throw new Error(
                `Explicit encryption failed for ${field}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }
        }
      };
    }

    // Method to explicitly decrypt all fields
    if (!target.constructor.prototype.decryptFields) {
      target.constructor.prototype.decryptFields = async function (): Promise<
        void
      > {
        const encryptedFields = getMetadata(
          "encryptedFields",
          this.constructor,
        ) as EncryptedFieldMetadata;
        if (!encryptedFields) return;

        for (const field of encryptedFields.fields) {
          if (this[`__encrypted_${field}`]) {
            try {
              const fieldService = new EncryptionService({
                algorithm: encryptedFields.algorithm,
                keyLength: encryptedFields.keyLength,
                keySource,
                keyEnvVar,
                keyResolver: options.keyResolver,
                keyConfig,
              });

              const encryptedJson = this[`__encrypted_${field}`];
              const encrypted = JSON.parse(encryptedJson);
              const decrypted = await fieldService.decrypt(encrypted);
              this[field] = decrypted;
              delete this[`__encrypted_${field}`];
            } catch (error: unknown) {
              console.error(
                `Failed to decrypt ${field}:`,
                error instanceof Error ? error.message : String(error),
              );
              throw new Error(
                `Explicit decryption failed for ${field}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }
        }
      };
    }

    // Add static helpers for finding models with encrypted fields
    const modelConstructor = target.constructor as {
      prototype: {
        decryptFields: () => Promise<void>;
      };
      find?: (
        adapter: unknown,
        query?: Record<string, unknown>,
      ) => Promise<unknown[]>;
    };

    if (
      !Object.prototype.hasOwnProperty.call(
        modelConstructor,
        "withDecryptedFields",
      )
    ) {
      Object.defineProperty(modelConstructor, "withDecryptedFields", {
        value: async function (
          adapter: unknown,
          query?: Record<string, unknown>,
        ): Promise<unknown[]> {
          if (typeof this.find !== "function") {
            throw new Error(
              "The withDecryptedFields method requires a find method on the model class",
            );
          }

          const items = await this.find(adapter, query);

          // Decrypt fields for all items
          const promises = items.map((item: unknown) => {
            return (item as { decryptFields: () => Promise<void> })
              .decryptFields();
          });

          await Promise.all(promises);
          return items;
        },
        writable: false,
        configurable: true,
      });
    }

    // Register this field feature with the ModelRegistry
    ModelRegistry.registerFieldFeature(
      target.constructor as { new (...args: unknown[]): unknown },
      propertyKey,
      "encrypted",
    );
  };
}
