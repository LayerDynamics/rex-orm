// Define the augmentation of the globalThis interface
declare global {
  interface GlobalThis {
    currentTenantId?: string;
  }
}

export {};
