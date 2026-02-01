import { ApeClient } from '@/components/Explore/client';
import {
  GetGemsTokenListRequest,
  GetTxsResponse,
  TokenListFilters,
  TokenListTimeframe,
  resolveTokenListFilters,
} from './types';
import { ExtractQueryData } from 'types/fancytypes';

export type QueryData<T> = T extends (...args: infer OptionsArgs) => {
  queryFn: (...args: infer Args) => Promise<infer R>;
}
  ? R
  : never;

export type GemsTokenListQueryArgs = {
  [list in keyof GetGemsTokenListRequest]: {
    timeframe: TokenListTimeframe;
    filters?: TokenListFilters;
  };
};

export type TokenInfoQueryData = ExtractQueryData<typeof ApeQueries.tokenInfo>;

// TODO: upgrade to `queryOptions` helper in react query v5
// TODO: move this to a centralised file close to the `useQuery` hooks these are called in

// We include args in the query fn return so know args when mutating queries
export const ApeQueries = {
  gemsTokenList: (args: GemsTokenListQueryArgs) => {
    const req: GetGemsTokenListRequest = {};
    
    // Build request object dynamically from args
    Object.entries(args).forEach(([key, value]) => {
      if (value) {
        req[key as keyof GetGemsTokenListRequest] = {
          timeframe: value.timeframe,
          ...resolveTokenListFilters(value.filters),
        };
      }
    });

    return {
      queryKey: ['explore', 'gems', args],
      queryFn: async () => {
        const res = await ApeClient.getGemsTokenList(req);
        return Object.assign(res, { args });
      },
    };
  },
  tokenInfo: (args: { id: string }) => {
    return {
      queryKey: ['explore', 'token', args.id, 'info'],
      queryFn: async () => {
        const info = await ApeClient.getToken({ id: args.id });
        if (!info?.pools[0]) {
          throw new Error('No token info found');
        }
        const pool = info?.pools[0];

        // Add frontend fields

        return {
          ...pool,
          bondingCurveId: null as any,
        };
      },
    };
  },
  tokensInfo: (args: { ids: string[] }) => {
    return {
      queryKey: ['explore', 'tokens', args.ids, 'info'],
      queryFn: async () => {
        const info = await ApeClient.getTokens({ ids: args.ids });
        if (!info?.pools) {
          throw new Error('No tokens info found');
        }
        
        return info.pools.map(pool => ({
          ...pool,
          bondingCurveId: null as any,
        }));
      },
    };
  },
  tokensBySearch: (args: { query: string }) => {
    return {
      queryKey: ['explore', 'token', args.query],
      queryFn: async () => {
        const res = await ApeClient.getTokensBySearch({ query: args.query });
        if (!res) {
          throw new Error('No token info found');
        }
        return res;
      },
    };
  },
  tokenHolders: (args: { id: string }) => {
    return {
      queryKey: ['explore', 'token', args.id, 'holders'],
      queryFn: async () => {
        const res = await ApeClient.getTokenHolders(args.id);
        return Object.assign(res, { args });
      },
    };
  },
  tokenTxs: (args: { id: string }) => {
    return {
      queryKey: ['explore', 'token', args.id, 'txs'],
      queryFn: async ({ signal, pageParam }: any) => {
        const res = await ApeClient.getTokenTxs(
          args.id,
          pageParam
            ? {
                ...pageParam,
              }
            : {},
          { signal }
        );
        return Object.assign(res, {
          args,
        });
      },
      // This gets passed as `pageParam`
      getNextPageParam: (lastPage: GetTxsResponse) => {
        // Stop pagination if no transactions returned or no next page token
        if (lastPage?.txs.length === 0 || !lastPage?.next) {
          return undefined;
        }
        const lastTs = lastPage?.txs[lastPage?.txs.length - 1]?.timestamp;
        return {
          offset: lastPage?.next,
          offsetTs: lastTs,
        };
      },
    };
  },
};
