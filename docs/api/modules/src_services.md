# Module: src/services

## Classes

### EncryptionService

Service responsible for encrypting and decrypting sensitive data
using the Web Crypto API.

#### Methods

##### `isEncryptedData()`

Checks if a string appears to be in encrypted data format

##### `getEncryptionKey()`

Gets the encryption key based on the configured key source

##### `encrypt()`

Encrypts a string value using the configured algorithm

##### `decrypt()`

Decrypts an encrypted data object

##### `arrayBufferToBase64()`

Converts an ArrayBuffer or Uint8Array to a Base64 string

##### `base64ToArrayBuffer()`

Converts a Base64 string to an ArrayBuffer


