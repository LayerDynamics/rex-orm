/**
 * Utility functions for error handling in TypeScript/Deno
 */

/**
 * Helper function to convert different error types to string messages
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error;
  } else {
    return String(error);
  }
}

/**
 * Safely logs an error with proper type checking
 * @param message The error context message
 * @param error The error object
 */
export function logError(message: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`${message}: ${error.message}`);
    // Log stack trace in development environment
    if (Deno.env.get("ENVIRONMENT") !== "production") {
      console.error(error.stack);
    }
  } else {
    console.error(`${message}: ${String(error)}`);
  }
}

/**
 * Wraps a function with proper error handling
 * @param fn Function to execute
 * @param errorMessage Message to log on error
 * @returns Result of the function or throws enhanced error
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(errorMessage, error);
    throw error instanceof Error
      ? error
      : new Error(`${errorMessage}: ${String(error)}`);
  }
}
