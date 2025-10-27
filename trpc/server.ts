// Placeholder for tRPC server - will be replaced with Appwrite integration
const queryOptions = () => ({ data: [] as any });

export const api = {
  apiKey: {
    list: { useQuery: () => ({ data: [] as any }) },
  },
  oauth: {
    list: { useQuery: () => ({ data: [] as any }) },
  },
};

export const trpc = {
  ...api,
  apiKeys: {
    get: {
      queryOptions,
    },
  },
  oauthApplications: {
    list: {
      queryOptions,
    },
  },
  team: {
    list: {
      queryOptions,
    },
  },
  user: {
    update: {
      mutationOptions: (options?: any) => ({
        mutationFn: (data: any) => Promise.resolve(null as any),
        ...options,
      }),
    },
  },
} as any;

export function batchPrefetch(...args: any[]) {
  return Promise.resolve();
}

export function prefetch(...args: any[]) {
  return Promise.resolve();
}
