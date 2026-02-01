import {
  Bar,
  GetMarksCallback,
  Mark,
  ResolutionString,
  SubscribeBarsCallback,
} from '@/components/AdvancedTradingView/charting_library';
import {
  MutableRefObject,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import { Pool } from './types';
import { GetChartRequest } from '@/components/Explore/types';
import { useDataStreamListener } from './DataStreamProvider';
import { asMarks } from './TokenChart/marks';
import { getNextBar } from './TokenChart/bars';
import { useTokenInfo } from '@/hooks/queries';
import { useUser } from './UserProvider';

const SMALL_TRADE_VALUE = 0.05;

type ITokenChartContext = {
  onNewSwapTxsRef: MutableRefObject<SubscribeBarsCallback | undefined>;
  resolutionRef: MutableRefObject<ResolutionString | undefined>;
  baseAssetRef: MutableRefObject<Pool['baseAsset'] | undefined>;
  resolutionToMostRecentBarRef: MutableRefObject<Record<string, Bar>>;
  chartTypeRef: MutableRefObject<GetChartRequest['type']>;
  userAddressRef: MutableRefObject<string | undefined>;
  onNewMarksRef: MutableRefObject<GetMarksCallback<Mark> | undefined>;
  showDevTradesRef: MutableRefObject<boolean>;
  showUserTradesRef: MutableRefObject<boolean>;
};

const SidebarTokenChartContext = createContext<ITokenChartContext | null>(null);

export const SidebarTokenChartProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const onNewSwapTxsRef = useRef<SubscribeBarsCallback | undefined>(undefined);
  const resolutionToMostRecentBarRef = useRef<Record<string, Bar>>({}); // key: `${poolAddress}`
  const resolutionRef = useRef<ResolutionString | undefined>(undefined);
  const chartTypeRef = useRef<GetChartRequest['type']>('price');
  const baseAssetRef = useRef<Pool['baseAsset'] | undefined>(undefined);
  const userAddressRef = useRef<string | undefined>(undefined);
  const onNewMarksRef = useRef<GetMarksCallback<Mark> | undefined>(undefined);
  const showDevTradesRef = useRef<boolean>(true);
  const showUserTradesRef = useRef<boolean>(true);

  // Required to calculate chart mcap
  const { data: tokenData } = useTokenInfo();
  const baseAsset = tokenData?.baseAsset;
  useLayoutEffect(() => {
    baseAssetRef.current = baseAsset;
  }, [baseAsset, baseAssetRef]);

  // Required to display user marks
  const { publicKey } = useUser();
  const address = publicKey?.toBase58();

  useLayoutEffect(() => {
    userAddressRef.current = address;
  }, [address, userAddressRef]);

  // Add periodic refresh for higher timeframes to ensure latest price is shown
  useEffect(() => {
    const interval = setInterval(() => {
      const resolution = resolutionRef.current;
      const baseAsset = baseAssetRef.current;
      const resolutionToMostRecentBar = resolutionToMostRecentBarRef.current;
      
      // Only refresh for higher timeframes (1h and above)
      const isHigherTimeframe = resolution && ['60', '120', '240', '480', '720', '1D', '1W', '1M'].includes(resolution);
      if (!isHigherTimeframe || !baseAsset || !resolutionToMostRecentBar) {
        return;
      }

      const mostRecentBarKey = baseAsset.id;
      const recentBar = resolutionToMostRecentBar[mostRecentBarKey];
      if (!recentBar) {
        return;
      }

      // Trigger a small update to refresh the current candle
      // This ensures the chart shows the latest price even if no new transactions occurred
      const callback = onNewSwapTxsRef.current;
      if (callback) {
        // Create a minimal update to refresh the current candle
        const refreshBar = { ...recentBar };
        callback(refreshBar);
      }
    }, 30000); // Refresh every 30 seconds for higher timeframes

    return () => clearInterval(interval);
  }, []);

  useDataStreamListener(
    ['actions'],
    useCallback((_get, _set, msg) => {
      // Update chart data
      const resolution = resolutionRef.current;
      const baseAsset = baseAssetRef.current;
      const resolutionToMostRecentBar = resolutionToMostRecentBarRef.current;
      if (!resolution || !baseAsset || !resolutionToMostRecentBar) {
        console.error('DataStream: missing data, cannot update live chart: ', {
          resolution,
          baseAsset,
          resolutionToMostRecentBar,
        });
        return;
      }

      // Filter txs to draw on chart
      const userAddress = userAddressRef.current;
      const devAddress = baseAsset.dev;
      const filteredTxs = msg.data.filter(
        (tx) =>
          // Relavent token
          tx.asset === baseAsset.id &&
          // Remove MEV swaps
          !tx.isMev &&
          // Remove tiny swaps
          tx.usdVolume >= SMALL_TRADE_VALUE &&
          // Ensure swaps are from most reliable pool OR user/dev trades OR a "reliable swap" from another pool
          (tx.isValidPrice || tx.traderAddress === userAddress || tx.traderAddress === devAddress)
      );

      if (filteredTxs.length === 0) {
        // This is normal for some tokens, just skip the update
        console.debug('DataStream: no valid txs found for current filter, skipping update');
        return;
      }

      // Chart Marks
      const onNewMarks = onNewMarksRef.current;
      const showDevTrades = showDevTradesRef.current;
      if (onNewMarks && showDevTrades && devAddress) {
        const devSwaps = filteredTxs.filter((action) => action.traderAddress === devAddress);
        if (devSwaps.length > 0) {
          const marks = asMarks(
            devSwaps,
            { id: baseAsset.id, circSupply: baseAsset.circSupply },
            true
          );
          onNewMarks(marks);
        }
      }
      const showUserTrades = showUserTradesRef.current;
      if (onNewMarks && showUserTrades && userAddress) {
        const userSwaps = filteredTxs.filter((action) => action.traderAddress === userAddress);
        if (userSwaps.length > 0) {
          const marks = asMarks(userSwaps, { id: baseAsset.id, circSupply: baseAsset.circSupply });
          onNewMarks(marks);
        }
      }

      const mostRecentBarKey = baseAsset.id;
      const recentBar = resolutionToMostRecentBar[mostRecentBarKey];
      if (!recentBar) {
        // Instead of erroring, just skip this update until the chart is properly initialized
        console.debug(
          "DataStream: Chart not yet initialized for token, skipping update: ",
          {
            tokenId: mostRecentBarKey,
            availableKeys: Object.keys(resolutionToMostRecentBar),
          }
        );
        return;
      }

      const nextBar = getNextBar(
        recentBar,
        filteredTxs,
        resolution,
        chartTypeRef.current === 'mcap' ? baseAsset.circSupply : 1
      );
      if (!nextBar) {
        // This can happen with invalid data, just skip the update
        console.debug("DataStream: Could not generate next bar, skipping update");
        return;
      }

      // Smart update: For higher timeframes, always update the current candle with latest price
      // This ensures the chart shows live price movements even on 1h, 2h, 4h, 8h, 12h, 1D, 1W, 1M timeframes
      const isHigherTimeframe = ['60', '120', '240', '480', '720', '1D', '1W', '1M'].includes(resolution);
      const shouldUpdateCurrentCandle = isHigherTimeframe && nextBar.time === recentBar.time;
      
      if (shouldUpdateCurrentCandle) {
        // For higher timeframes, update the current candle with the latest price from the most recent transaction
        const latestTx = filteredTxs[filteredTxs.length - 1];
        if (latestTx) {
          const latestPrice = latestTx.usdPrice * (chartTypeRef.current === 'mcap' ? baseAsset.circSupply : 1);
          nextBar.close = latestPrice;
          nextBar.high = Math.max(nextBar.high, latestPrice);
          nextBar.low = Math.min(nextBar.low, latestPrice);
        }
      }

      // copy is necessary since TV mutates the bar
      resolutionToMostRecentBar[mostRecentBarKey] = structuredClone(nextBar);

      const callback = onNewSwapTxsRef.current;
      if (!callback) {
        // Chart callback not set up yet, this is normal during initialization
        console.debug('DataStream: Chart callback not ready, skipping update');
        return;
      }
      callback(nextBar);
    }, [])
  );

  return (
    <SidebarTokenChartContext.Provider
      value={{
        onNewSwapTxsRef,
        resolutionRef,
        baseAssetRef,
        resolutionToMostRecentBarRef,
        chartTypeRef,
        userAddressRef,
        onNewMarksRef,
        showUserTradesRef,
        showDevTradesRef,
      }}
    >
      {children}
    </SidebarTokenChartContext.Provider>
  );
};

export const useSidebarTokenChart = () => {
  const context = useContext(SidebarTokenChartContext);
  if (!context) {
    throw new Error('useSidebarTokenChart must be used within SidebarTokenChartProvider');
  }
  return context;
};
