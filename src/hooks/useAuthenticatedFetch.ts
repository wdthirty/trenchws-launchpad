import { useCallback } from 'react';
import { authFetch } from '@/lib/auth/authInterceptor';

/**
 * Hook for making authenticated API calls with automatic error handling
 * Automatically handles 401/403 errors by triggering logout
 */
export const useAuthenticatedFetch = () => {
  const authenticatedFetch = useCallback(async (
    input: RequestInfo | URL, 
    init?: RequestInit
  ): Promise<Response> => {
    return authFetch(input, init);
  }, []);

  /**
   * Helper for making JSON API calls with authentication
   */
  const fetchJson = useCallback(async <T = any>(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<T> => {
    const response = await authenticatedFetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!response.ok) {
      // If it's an auth error, the interceptor will handle it
      // For other errors, throw them normally
      if (response.status !== 401 && response.status !== 403) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    return response.json();
  }, [authenticatedFetch]);

  /**
   * Helper for making POST requests with JSON data
   */
  const postJson = useCallback(async <T = any>(
    url: string,
    data: any,
    init?: RequestInit
  ): Promise<T> => {
    return fetchJson<T>(url, {
      ...init,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, [fetchJson]);

  /**
   * Helper for making PUT requests with JSON data
   */
  const putJson = useCallback(async <T = any>(
    url: string,
    data: any,
    init?: RequestInit
  ): Promise<T> => {
    return fetchJson<T>(url, {
      ...init,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }, [fetchJson]);

  /**
   * Helper for making DELETE requests
   */
  const deleteRequest = useCallback(async <T = any>(
    url: string,
    init?: RequestInit
  ): Promise<T> => {
    return fetchJson<T>(url, {
      ...init,
      method: 'DELETE',
    });
  }, [fetchJson]);

  return {
    fetch: authenticatedFetch,
    fetchJson,
    postJson,
    putJson,
    delete: deleteRequest,
  };
};

/**
 * Type for the return value of useAuthenticatedFetch
 */
export type AuthenticatedFetch = ReturnType<typeof useAuthenticatedFetch>;
