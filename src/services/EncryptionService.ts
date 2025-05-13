import { EncryptionOptions } from "../decorators/Encrypted.ts";

/**
 * Interface for encrypted data structure stored in the database
 */
export interface EncryptedData {
  /** Base64 encoded initialization vector */
  iv: string;

  /** Base64 encoded encrypted data */
  data: string;

  /** Base64 encoded authentication tag (for GCM mode) */
  tag?: string;

  /** Algorithm used for encryption */
  alg: string;
}

/**
 * Service responsible for encrypting and decrypting sensitive data
 * using the Web Crypto API.
 */
export class EncryptionService {
  private algorithm: "AES-GCM" | "AES-CBC";
  private keyLength: 128 | 192 | 256;
  private keySource: "env" | "config" | "keyResolver";
  private keyEnvVar: string;
  private keyConfig: string;
  private keyResolver?: () => Promise<CryptoKey>;

  /**
   * Creates a new encryption service with the specified options
   */
  constructor(options: EncryptionOptions) {
    this.algorithm = options.algorithm || "AES-GCM";
    this.keyLength = options.keyLength || 256;
    this.keySource = options.keySource || "env";
    this.keyEnvVar = options.keyEnvVar || "ENCRYPTION_KEY";
    this.keyConfig = options.keyConfig || "encryption.key";
    this.keyResolver = options.keyResolver;
  }

  /**
   * Checks if a string appears to be in encrypted data format
   */
  static isEncryptedData(value: unknown): boolean {
    if (typeof value !== "string") return false;

    try {
      const parsed = JSON.parse(value);
      return parsed &&
        typeof parsed === "object" &&
        typeof parsed.iv === "string" &&
        typeof parsed.data === "string" &&
        typeof parsed.alg === "string";
    } catch (_e) {
      return false;
    }
  }

  /**
   * Gets the encryption key based on the configured key source
   */
  private async getEncryptionKey(): Promise<CryptoKey> {
    if (this.keyResolver) {
      return this.keyResolver();
    }

    let rawKey: string;
    if (this.keySource === "env") {
      rawKey = Deno.env.get(this.keyEnvVar) || "";
      if (!rawKey) {
        throw new Error(
          `Encryption key environment variable ${this.keyEnvVar} not set`,
        );
      }
    } else if (this.keySource === "config") {
      // In a real implementation, this would load from a config service
      // For now we'll use a fallback approach
      try {
        const config = JSON.parse(
          Deno.readTextFileSync("./config/encryption.json"),
        );
        const parts = this.keyConfig.split(".");
        let value: unknown = config;

        for (const part of parts) {
          if (typeof value === "object" && value !== null && part in value) {
            value = (value as Record<string, unknown>)[part];
          } else {
            throw new Error(`Key not found in config: ${this.keyConfig}`);
          }
        }

        if (typeof value !== "string") {
          throw new Error(`Config value is not a string: ${this.keyConfig}`);
        }

        rawKey = value;
      } catch (error: unknown) {
        console.error(
          "Error loading encryption key from config:",
          error instanceof Error ? error.message : String(error),
        );
        throw new Error(
          `Failed to load encryption key from config: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } else {
      throw new Error(`Unsupported key source: ${this.keySource}`);
    }

    // Normalize the key (use SHA-256 to get right size for AES)
    const encoder = new TextEncoder();
    const keyData = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(rawKey),
    );

    // Import the key for use with the specified algorithm
    return await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: this.algorithm, length: this.keyLength },
      false,
      ["encrypt", "decrypt"],
    );
  }

  /**
   * Encrypts a string value using the configured algorithm
   */
  async encrypt(data: string): Promise<EncryptedData> {
    const key = await this.getEncryptionKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate a random IV
    const ivLength = this.algorithm === "AES-GCM" ? 12 : 16; // 12 bytes for GCM, 16 for CBC
    const iv = crypto.getRandomValues(new Uint8Array(ivLength));

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv: iv,
        ...(this.algorithm === "AES-GCM" ? { tagLength: 128 } : {}),
      },
      key,
      dataBuffer,
    );

    // For GCM, the last 16 bytes are the authentication tag
    let authTag: Uint8Array | undefined;
    let encryptedData: Uint8Array;

    if (this.algorithm === "AES-GCM") {
      // Extract the tag (last 16 bytes)
      const encryptedBufferArray = new Uint8Array(encryptedBuffer);
      const tagLength = 16; // 128 bits
      const dataLength = encryptedBufferArray.length - tagLength;

      encryptedData = encryptedBufferArray.slice(0, dataLength);
      authTag = encryptedBufferArray.slice(dataLength);
    } else {
      encryptedData = new Uint8Array(encryptedBuffer);
    }

    // Base64 encode all binary data for storage
    return {
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(encryptedData),
      ...(authTag ? { tag: this.arrayBufferToBase64(authTag) } : {}),
      alg: this.algorithm,
    };
  }

  /**
   * Decrypts an encrypted data object
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    // Verify the algorithm matches what we expect
    if (encryptedData.alg !== this.algorithm) {
      throw new Error(
        `Algorithm mismatch: expected ${this.algorithm}, got ${encryptedData.alg}`,
      );
    }

    const key = await this.getEncryptionKey();

    // Decode the Base64 encoded data
    const iv = this.base64ToArrayBuffer(encryptedData.iv);
    const data = this.base64ToArrayBuffer(encryptedData.data);

    let encryptionData: ArrayBuffer;

    if (this.algorithm === "AES-GCM" && encryptedData.tag) {
      // For GCM, we need to combine the ciphertext and tag
      const tag = this.base64ToArrayBuffer(encryptedData.tag);
      const combined = new Uint8Array(
        new Uint8Array(data).byteLength + new Uint8Array(tag).byteLength,
      );
      combined.set(new Uint8Array(data));
      combined.set(new Uint8Array(tag), new Uint8Array(data).byteLength);
      encryptionData = combined.buffer;
    } else {
      encryptionData = data;
    }

    try {
      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv,
          ...(this.algorithm === "AES-GCM" ? { tagLength: 128 } : {}),
        },
        key,
        encryptionData,
      );

      // Convert back to a string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error: unknown) {
      console.error(
        "Decryption failed:",
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Failed to decrypt data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Converts an ArrayBuffer or Uint8Array to a Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Converts a Base64 string to an ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
