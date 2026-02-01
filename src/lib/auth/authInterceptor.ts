import { toast } from 'sonner';

export interface AuthInterceptorConfig {
  onAuthError: () => void;
  showErrorMessage?: boolean;
  errorMessage?: string;
}

/**
 * HTTP fetch wrapper that automatically handles authentication errors
 * Intercepts 401/403 responses and triggers automatic logout
 */
export class AuthInterceptor {
  private config: AuthInterceptorConfig;
  private isLoggingOut = false;

  constructor(config: AuthInterceptorConfig) {
    this.config = {
      showErrorMessage: true,
      errorMessage: 'Your session has expired. Please log in again.',
      ...config,
    };
  }

  /**
   * Enhanced fetch that handles authentication errors
   */
  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(input, init);

      // Check for authentication errors
      if (response.status === 401 || response.status === 403) {
        await this.handleAuthError(response, input);
        return response; // Return the original response for the caller to handle
      }

      return response;
    } catch (error) {
      // Network or other errors - just re-throw
      throw error;
    }
  }

  /**
   * Handle authentication errors
   */
  private async handleAuthError(response: Response, input: RequestInfo | URL): Promise<void> {
    // Prevent multiple simultaneous logout attempts
    if (this.isLoggingOut) {
      console.log('🔐 Authentication error detected but logout already in progress');
      return;
    }

    this.isLoggingOut = true;

    console.warn('🔐 Authentication error detected:', {
      status: response.status,
      statusText: response.statusText,
      url: typeof input === 'string' ? input : input.toString(),
    });

    // Show error message if enabled
    if (this.config.showErrorMessage) {
      toast.error(this.config.errorMessage!);
    }

    // Trigger logout callback
    try {
      await this.config.onAuthError();
    } catch (error) {
      console.error('Error during automatic logout:', error);
    } finally {
      // Reset flag after a delay to allow for potential re-initialization
      setTimeout(() => {
        this.isLoggingOut = false;
      }, 5000);
    }
  }
}

/**
 * Global auth interceptor instance
 * Will be initialized in the UserProvider
 */
export let globalAuthInterceptor: AuthInterceptor | null = null;

/**
 * Initialize the global auth interceptor
 */
export const initializeAuthInterceptor = (config: AuthInterceptorConfig) => {
  globalAuthInterceptor = new AuthInterceptor(config);
};

/**
 * Enhanced fetch function that uses the global auth interceptor
 * Use this instead of the native fetch for API calls that require authentication
 */
export const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (!globalAuthInterceptor) {
    console.warn('Auth interceptor not initialized, falling back to native fetch');
    return fetch(input, init);
  }

  return globalAuthInterceptor.fetch(input, init);
};

/**
 * Hook for making authenticated API calls with automatic error handling
 */
export const useAuthFetch = () => {
  return authFetch;
};
