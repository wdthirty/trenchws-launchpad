import ky, { Options } from 'ky';
import {
  GetChartRequest,
  GetChartResponse,
  GetGemsTokenListIndividualResponse,
  GetGemsTokenListRequest,
  GetTokenBySearchRequest,
  GetTokenRequest,
  GetTokenResponse,
  GetTopHoldersResponse,
  GetTxsRequest,
  GetTxsResponse,
  TokensBySearchInfo,
  GetTokensRequest,
} from './types';
import { serializeParams } from '@/lib/utils';

const BASE_URL = 'https://datapi.jup.ag';

export class ApeClient {
  static async getGemsTokenList<T extends GetGemsTokenListRequest>(
    req: T,
    options?: Options
  ): Promise<{
    [K in keyof T]: undefined extends T[K]
      ? GetGemsTokenListIndividualResponse | undefined
      : GetGemsTokenListIndividualResponse;
  }> {
    return ky
      .post(`${BASE_URL}/v1/pools/gems`, {
        json: req,
        ...options,
      })
      .json();
  }
  static async getToken(req: GetTokenRequest, options?: Options): Promise<GetTokenResponse> {
    return ky
      .get(`${BASE_URL}/v1/pools`, {
        searchParams: serializeParams({
          assetIds: [req.id],
        }),
        ...options,
      })
      .json();
  }
  
  static async getTokens(req: GetTokensRequest, options?: Options): Promise<GetTokenResponse> {
    return ky
      .get(`${BASE_URL}/v1/pools`, {
        searchParams: serializeParams({
          assetIds: req.ids,
        }),
        ...options,
      })
      .json();
  }

  static async getTokensBySearch(req: GetTokenBySearchRequest): Promise<TokensBySearchInfo[]> {
    return ky
      .get(`${BASE_URL}/v1/assets/search`, {
        searchParams: serializeParams({
          query: [req.query],
        }),
      })
      .json();
  }

  static async getTokenHolders(assetId: string, options?: Options): Promise<GetTopHoldersResponse> {
    return ky.get(`${BASE_URL}/v1/holders/${assetId}`, options).json();
  }

  static async getChart(
    assetId: string,
    params: GetChartRequest,
    options?: Options
  ): Promise<GetChartResponse> {
    return ky
      .get(`${BASE_URL}/v2/charts/${assetId}`, {
        searchParams: serializeParams(params),
        ...options,
      })
      .json();
  }

  static async getTokenTxs(
    assetId: string,
    req: GetTxsRequest,
    options?: Options
  ): Promise<GetTxsResponse> {
    return ky
      .get(`${BASE_URL}/v1/txs/${assetId}`, {
        searchParams: serializeParams(req),
        ...options,
      })
      .json();
  }

  static async getSolPrice(options?: Options): Promise<number> {
    try {
      const response = await ky
        .get(`${BASE_URL}/v1/pools`, {
          searchParams: serializeParams({
            assetIds: ['So11111111111111111111111111111111111111112'],
          }),
          ...options,
        })
        .json<{ pools: Array<{ id: string; baseAsset: { id: string; usdPrice: number } }> }>();



      // Extract SOL price from the first pool
      const solPrice = response.pools?.[0]?.baseAsset?.usdPrice;
      
      if (!solPrice || solPrice <= 0) {
        console.error('❌ Invalid SOL price received:', {
          solPrice,
          response: JSON.stringify(response, null, 2)
        });
        throw new Error(`Invalid SOL price received: ${solPrice}`);
      }

      return solPrice;
    } catch (error) {
      console.error('❌ Failed to fetch SOL price:', error);
      throw error;
    }
  }
}
