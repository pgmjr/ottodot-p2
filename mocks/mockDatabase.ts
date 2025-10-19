/**
 * Mock Supabase Client
 *
 * This replaces the real Supabase database connection with mock data.
 * Simulates network delays and occasional failures to test error handling.
 */

import { mockAssignment, mockSession, mockUser, mockResponsesStorage } from './mockAssignment';

// Simulate network delay (random 500-3000ms)
const simulateNetworkDelay = () => {
  return new Promise(resolve => {
    const delay = 500 + Math.random() * 2500;
    setTimeout(resolve, delay);
  });
};

// Simulate occasional network failures (10% failure rate)
const simulateNetworkFailure = () => {
  if (Math.random() < 0.1) {
    throw new Error('Network timeout - simulated failure');
  }
};

/**
 * Mock Supabase client
 * Mimics the structure of the real @supabase/supabase-js client
 */
export const mockSupabase = {
  // Auth methods
  auth: {
    getUser: async () => {
      // await simulateNetworkDelay();
      // simulateNetworkFailure();
      return {
        data: { user: mockUser },
        error: null
      };
    },
    getSession: async () => {
      // await simulateNetworkDelay();
      return {
        data: { session: { user: mockUser } },
        error: null
      };
    },
    onAuthStateChange: (callback: any) => {
      // Immediately call with current session
      setTimeout(() => {
        callback('SIGNED_IN', { user: mockUser });
      }, 100);
      return {
        data: {
          subscription: {
            unsubscribe: () => { }
          }
        }
      };
    }
  },

  // Database query methods
  from: (table: string) => {
    const queryBuilder = {
      select: (columns: string = '*') => {
        const selectBuilder = {
          eq: (column: string, value: any) => {
            const eqBuilder = {
              single: async () => {
                // await simulateNetworkDelay();
                // simulateNetworkFailure();

                // Return mock data based on table
                if (table === 'homework_sessions') {
                  return { data: mockSession, error: null };
                }
                if (table === 'assignments') {
                  return { data: mockAssignment, error: null };
                }
                return { data: null, error: { message: 'Not found' } };
              },
              maybeSingle: async () => {
                // await simulateNetworkDelay();
                if (table === 'homework_sessions') {
                  return { data: mockSession, error: null };
                }
                return { data: null, error: null };
              },
              limit: (count: number) => ({
                single: async () => {
                  // await simulateNetworkDelay();
                  return { data: mockSession, error: null };
                }
              }),
              order: (column: string, options: any) => ({
                limit: (count: number) => ({
                  single: async () => {
                    // await simulateNetworkDelay();
                    return { data: mockSession, error: null };
                  }
                })
              })
            };
            return eqBuilder;
          }
        };
        return selectBuilder;
      },

      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            // await simulateNetworkDelay();
            // simulateNetworkFailure();

            // Create new session or response
            if (table === 'homework_sessions') {
              return { data: { ...mockSession, ...data }, error: null };
            }
            return { data: { id: 'new-id', ...data }, error: null };
          }
        })
      }),

      update: (data: any) => ({
        eq: async (column: string, value: any) => {
          // await simulateNetworkDelay();
          // simulateNetworkFailure();

          // Update session or response
          return { error: null };
        }
      }),

      upsert: async (data: any, options?: any) => {
        // await simulateNetworkDelay();
        // simulateNetworkFailure();

        // Save response to mock storage
        if (table === 'homework_responses') {
          mockResponsesStorage[data.question_id] = data.response_text;
        }

        return { error: null };
      }
    };

    return queryBuilder;
  },

  // RPC methods (for database functions)
  rpc: async (functionName: string, params: any) => {
    // await simulateNetworkDelay();
    // simulateNetworkFailure();
    return { data: null, error: null };
  }
};
