/**
 * Get the backend API URL from environment variables
 * Falls back to localhost if not defined
 */
export function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:1337';
}
