import { CSSProperties, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from 'react-use';

import { createDataFeed } from './datafeed';
import { formatChartPrice, getPrecisionTickSizeText } from './formatter';
import { CHART_BG_COLOR, CHART_GRID_LINE_COLOR } from './constants';
import { ChartConfig, DEFAULT_CHART_CONFIG } from './config';
import { FAVORITE_INTERVALS } from './intervals';
import { loadChartState, saveChartState } from './chartstate';

import {
  ChartingLibraryWidgetOptions,
  IChartingLibraryWidget,
  IChartWidgetApi,
  ResolutionString,
} from '../AdvancedTradingView/charting_library';
import { TradingViewLoader } from './TradingViewLoader';
import Spinner from '../Spinner/Spinner';
import { cn } from '@/lib/utils';
import { RefreshMarks } from './RefreshMarks';
import { useTokenChart } from '@/contexts/TokenChartProvider';
import { useTokenInfo } from '@/hooks/queries';
import { useIsMobile } from '@/hooks/useIsMobile';

// TradingView types are declared in TradingViewLoader

export interface TVOptions {
  enableVolumeStudy?: boolean;
  useUserBrowserTime?: boolean;
  showSeriesOHLC?: boolean;
  showVolume?: boolean;
  showPriceSource?: boolean;
  showBarChange?: boolean;
  isMobile?: boolean;
}

export const DEFAULT_OPTIONS: Required<TVOptions> = {
  enableVolumeStudy: true,
  useUserBrowserTime: true,
  showSeriesOHLC: false,
  showVolume: true,
  showPriceSource: true,
  showBarChange: false,
  isMobile: false,
};

type ChartProps = {
  renderingId?: string;
  style?: CSSProperties;
  positions?: [];
  opt?: TVOptions;
};

const TRADING_VIEW_DOMAIN = 'https://static.jup.ag';

const ENABLED_FEATURES: ChartingLibraryWidgetOptions['enabled_features'] = [
  'header_in_fullscreen_mode', // Enable tools in fullscreen mode
  'side_toolbar_in_fullscreen_mode', // Enable tools in fullscreen mode
  'seconds_resolution', // Enable seconds resolution
  'two_character_bar_marks_labels', // Enable marks to be displayed with two characters.
  'create_volume_indicator_by_default', // create by default, if opt.enableVolumeStudy = false, will remove at onChartReady()
  'axis_pressed_mouse_move_scale',
];

const DISABLED_FEATURES: ChartingLibraryWidgetOptions['disabled_features'] = [
  'header_symbol_search',
  'header_compare',
  'popup_hints',
  'vert_touch_drag_scroll', // allow vertical scrolling of webpage on touch screen
  'header_saveload', // remove "save" header button
  'symbol_search_hot_key',
  'timeframes_toolbar', // hide bottom timeframe, timezone bar
  'header_undo_redo',
  'display_market_status',
];

export const TokenChart: React.FC<ChartProps> = memo(({ renderingId, style, opt }) => {
  const isMobile = useIsMobile();
  const [chartConfig, setChartConfig] = useLocalStorage<ChartConfig>(
    'chart_config',
    DEFAULT_CHART_CONFIG
  );

  const {
    resolutionRef,
    chartTypeRef,
    showDevTradesRef,
    showUserTradesRef,
    baseAssetRef,
    resolutionToMostRecentBarRef,
    onNewMarksRef,
    onNewSwapTxsRef,
    userAddressRef,
  } = useTokenChart();

  useLayoutEffect(() => {
    if (!chartConfig) {
      return;
    }
    resolutionRef.current = chartConfig.lastInterval;
    chartTypeRef.current = chartConfig.chartType;
    showDevTradesRef.current = chartConfig.showDevTrades;
    showUserTradesRef.current = chartConfig.showUserTrades;
  }, [chartConfig, resolutionRef, chartTypeRef, showDevTradesRef, showUserTradesRef]);

  const options: Required<TVOptions> = useMemo(
    () => ({
      ...DEFAULT_OPTIONS,
      ...opt,
      isMobile,
    }),
    [opt, isMobile]
  );

  const widgetRef = useRef<IChartingLibraryWidget | null>(null);
  const htmlId = useMemo(() => `${renderingId || 'main'}-tradingview-chart`, [renderingId]);
  const priceMcapTogglerRef = useRef<HTMLElement | null>(null);
  const devTradesTogglerRef = useRef<HTMLElement | null>(null);
  const userTradesTogglerRef = useRef<HTMLElement | null>(null);
  const resetCacheFnRef = useRef<Record<string, () => void>>({});
  const isMarksLoadingRef = useRef<boolean>(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [forceReload, setForceReload] = useState(0);

  // Update button titles when chartConfig changes
  useEffect(() => {
    if (chartConfig && isLoaded) {
      updateButtonTitles(chartConfig);
    }
  }, [chartConfig, isLoaded]);

  // Mobile fallback: Force reload if chart doesn't load within 5 seconds (reduced from 10)
  useEffect(() => {
    if (!isMobile || isLoaded) return undefined;

    const timeout = setTimeout(() => {
      if (!isLoaded && !isDataReady) {
        setForceReload(prev => prev + 1);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isMobile, isLoaded, isDataReady]);

  const { data: tokenInfo } = useTokenInfo((data) => data?.baseAsset);
  const symbol = useMemo(() => {
    return tokenInfo ? `${tokenInfo.symbol.toUpperCase()}/USD` : undefined;
  }, [tokenInfo]);

  // Add loading state to prevent premature widget initialization
  const isTokenDataReady = !!tokenInfo && !!symbol;

  // Mark element as ready after mount - optimized for mobile
  useEffect(() => {
    // On mobile, use requestAnimationFrame for better timing
    if (isMobile) {
      requestAnimationFrame(() => {
        setIsElementReady(true);
      });
    } else {
      setIsElementReady(true);
    }
  }, [isMobile]);

  // Set up widget on first mount - optimized initialization
  useEffect(() => {
    if (!isTokenDataReady || !isElementReady) {
      if (!isTokenDataReady) {
        // Token data not ready yet, waiting...
        return;
      }
      if (!isElementReady) {
        // Element not ready yet, waiting...
        return;
      }
      return;
    }

    const initializeWidget = async () => {
      try {
        // Check if the chart container element exists
        const chartContainer = document.getElementById(htmlId);
        if (!chartContainer) {
          console.error('Chart container not found:', htmlId);
          return Promise.resolve();
        }

        // TradingView library is loaded by TradingViewLoader
        if (!window.TradingView) {
          console.error('TradingView library not available');
          return Promise.resolve();
        }

        // Additional check for mobile - ensure the widget constructor is available
        if (isMobile && !window.TradingView.widget) {
          console.error('TradingView widget constructor not available on mobile');
          return Promise.resolve();
        }

        // Reduced mobile delay for faster initialization
        if (isMobile) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        const disabledFeatures = [...DISABLED_FEATURES];
        // Prevent TV from preventing to scroll the page on mobile
        if (isMobile) {
          disabledFeatures.push('axis_pressed_mouse_move_scale');
        }

        // On mobile, don't load saved chart state to avoid conflicts
        const chartData = isMobile ? undefined : loadChartState();
        
        // On mobile, clear any existing chart state to ensure clean initialization
        if (isMobile) {
          try {
            localStorage.removeItem('tv_chart_state');
          } catch (e) {
            // Ignore localStorage errors
          }
        }

        // Now that the script is loaded, we can safely create the widget
        const widget = new window.TradingView.widget({
          symbol,
          interval: (chartConfig?.lastInterval ?? '1') as ResolutionString, // 15 minutes
          locale: 'en',
          container: htmlId,
          theme: 'dark',
          autosize: true,
          auto_save_delay: 1,
          custom_css_url: `https://static.jup.ag/tv/css/tokenchart.css`,
          // Don't do override anymore, edit from template
          settings_overrides: {
            'chartEventsSourceProperties.breaks.visible': false,
            'paneProperties.legendProperties.showSeriesTitle': false,
            'scalesProperties.fontSize': isMobile ? 10 : 12,
          },
          overrides: {
            'mainSeriesProperties.highLowAvgPrice.highLowPriceLabelsVisible': false,
            'mainSeriesProperties.highLowAvgPrice.highLowPriceLinesVisible': false,
            'paneProperties.vertGridProperties.style': 1, // dashed
            'paneProperties.vertGridProperties.color': CHART_GRID_LINE_COLOR, // neutral-850
            'paneProperties.horzGridProperties.style': 1, // dashed
            'paneProperties.horzGridProperties.color': CHART_GRID_LINE_COLOR, // neutral-850
            'paneProperties.backgroundType': 'solid',
            'paneProperties.background': CHART_BG_COLOR,
            'mainSeriesProperties.statusViewStyle.symbolTextSource': 'description', // display token symbol, jup.ag in chart
            'mainSeriesProperties.candleStyle.downColor': "#ff5050", // rose.DEFAULT
            'mainSeriesProperties.candleStyle.borderDownColor': "#ff5050", // rose.DEFAULT
            'mainSeriesProperties.candleStyle.wickDownColor': "#ff5050", // rose.DEFAULT
            'mainSeriesProperties.candleStyle.upColor': "#2cff7a", // emerald.DEFAULT
            'mainSeriesProperties.candleStyle.borderUpColor': "#2cff7a", // emerald.DEFAULT
            'mainSeriesProperties.candleStyle.wickUpColor': "#2cff7a", // emerald.DEFAULT
            "paneProperties.legendProperties.showSeriesOHLC": false,
            "paneProperties.legendProperties.showBarChange": false,
            'scalesProperties.textColor': '#94a3b8',
            'scalesProperties.lineColor': '#1A1F26',
          },
          width: '100%' as any, // Ignore this typing, this fills to container
          height: '100%' as any, // Ignore this typing, this fills to container
          datafeed: createDataFeed(
            baseAssetRef,
            resolutionToMostRecentBarRef,
            onNewSwapTxsRef,
            chartTypeRef,
            userAddressRef,
            onNewMarksRef,
            showDevTradesRef,
            showUserTradesRef,
            isMarksLoadingRef,
            resetCacheFnRef
          ),
          library_path: `${TRADING_VIEW_DOMAIN}/tv/charting_library/bundles`,
          disabled_features: disabledFeatures,
          enabled_features: ENABLED_FEATURES,
          custom_formatters: {
            priceFormatterFactory: () => {
              return {
                format: (price: number) => {
                  const value = getPrecisionTickSizeText({
                    value: price,
                    maxSuffix: 6,
                  });
                  // formatnumber here to show the comma in the price, eg BTC: 95,000
                  return price > 1_000 ? formatChartPrice(price, 2) : value;
                },
              };
            },
          } as any,
          // Intentionally set as any to prevent overriding dateFormatter and timeFormatter
          favorites: {
            intervals: FAVORITE_INTERVALS,
          },
          saved_data: chartData,
        });
        widgetRef.current = widget;

        // Use onChartReady instead of headerReady to avoid TypeError
        widget.onChartReady(() => {
          const activeChart = widget.activeChart();
          if (!activeChart) {
            console.error('window.onChartReady: missing activechart, breaking!');
            return;
          }

          // Delete toggle button if previously created
          priceMcapTogglerRef.current?.remove();
          priceMcapTogglerRef.current = widget.createButton();
          priceMcapTogglerRef.current?.addEventListener('click', () => {
            if (!resolutionRef.current) {
              return;
            }
            setChartConfig({
              lastInterval: resolutionRef.current ?? DEFAULT_CHART_CONFIG.lastInterval,
              chartType: chartTypeRef.current === 'mcap' ? 'price' : 'mcap',
              showDevTrades: showDevTradesRef.current,
              showUserTrades: showUserTradesRef.current,
            });
          });

          devTradesTogglerRef.current?.remove();
          devTradesTogglerRef.current = widget.createButton();
          devTradesTogglerRef.current?.addEventListener('click', () => {
            if (isMarksLoadingRef.current || !activeChart) {
              return;
            }
            const showDevTrades = !showDevTradesRef.current;
            setChartConfig({
              lastInterval: resolutionRef.current ?? DEFAULT_CHART_CONFIG.lastInterval,
              chartType: chartTypeRef.current,
              showUserTrades: showUserTradesRef.current,
              showDevTrades,
            });
            if (showDevTrades) {
              activeChart.refreshMarks();
              return;
            }
            activeChart.clearMarks();
            activeChart.refreshMarks();
          });

          userTradesTogglerRef.current = widget.createButton();
          userTradesTogglerRef.current?.addEventListener('click', () => {
            if (isMarksLoadingRef.current || !activeChart) {
              return;
            }
            const showUserTrades = !showUserTradesRef.current;
            setChartConfig({
              lastInterval: resolutionRef.current ?? DEFAULT_CHART_CONFIG.lastInterval,
              chartType: chartTypeRef.current,
              showDevTrades: showDevTradesRef.current,
              showUserTrades,
            });
            if (showUserTrades) {
              activeChart.refreshMarks();
              return;
            }
            activeChart.clearMarks();
            activeChart.refreshMarks();
          });

          if (chartConfig) {
            updateButtonTitles(chartConfig);
          }

          const studies = activeChart.getAllStudies();
          const foundVolumeStudy = studies.find((item: any) => item.name === 'Volume');

          // This is to patch everyone settings to this, else it will be inconsistent
          widget.applyOverrides({
            'mainSeriesProperties.highLowAvgPrice.highLowPriceLabelsVisible': true,
            'mainSeriesProperties.highLowAvgPrice.highLowPriceLinesVisible': true,
            'paneProperties.vertGridProperties.style': 1, // dashed
            'paneProperties.vertGridProperties.color': CHART_GRID_LINE_COLOR, // neutral-850
            'paneProperties.horzGridProperties.style': 1, // dashed
            'paneProperties.horzGridProperties.color': CHART_GRID_LINE_COLOR, // neutral-850
            'paneProperties.backgroundType': 'solid',
            'paneProperties.background': CHART_BG_COLOR,
            'mainSeriesProperties.statusViewStyle.symbolTextSource': 'description', // display token symbol, jup.ag in chart
          });

          // Force price chart auto scaling
          const panes = activeChart.getPanes();
          const priceScale = panes[0]?.getMainSourcePriceScale();
          if (priceScale) {
            priceScale.setAutoScale(true);
          }

          // Remove volume on mobile OR ensure volume is created if enabled AND on desktop
          if (opt?.enableVolumeStudy && !isMobile) {
            if (!foundVolumeStudy) {
              activeChart.createStudy('Volume');
            }
          } else if (foundVolumeStudy) {
            activeChart.removeEntity(foundVolumeStudy.id);
          }

          // Save the chart state to local storage
          widget.subscribe('onAutoSaveNeeded', () => {
            widget.save(saveChartState);
          });

          // Handle chart loading sequence
          activeChart.dataReady(() => {
            setIsDataReady(true);
          });

          // Save the last interval user chose
          activeChart.onIntervalChanged().subscribe(null, (interval: any) => {
            setChartConfig({
              chartType: chartTypeRef.current,
              showDevTrades: showDevTradesRef.current,
              showUserTrades: showUserTradesRef.current,
              lastInterval: interval,
            });
          });

          if (options.useUserBrowserTime) {
            const timezoneApi = activeChart.getTimezoneApi();
            const userTz = new Date().getTimezoneOffset() * 60 * 1000 * -1; // This is how TV handles timezone offset, don't ask why, don't know why
            const detectedTimezone = timezoneApi
              .availableTimezones()
              .find((item: any) => item.offset === userTz);
            timezoneApi.setTimezone(detectedTimezone?.id || 'Etc/UTC');
          }

          setIsLoaded(true);
        });

        return () => {
          widget.remove();
          widgetRef.current = null;
        };
      } catch (error) {
        console.error('Failed to initialize TradingView widget:', error);
        
        // Optimized retry on mobile with reduced backoff
        if (isMobile && retryCount < 2) { // Reduced from 3 to 2 retries
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 500 * (retryCount + 1)); // Reduced backoff from 1000ms to 500ms
        }
        
        return Promise.resolve();
      }
    };
    initializeWidget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenDataReady, htmlId, isElementReady, retryCount, forceReload]);

  function updateButtonTitles(config: ChartConfig) {
    // Price/mcap toggle
    if (priceMcapTogglerRef.current) {
      if (config.chartType === 'mcap') {
        priceMcapTogglerRef.current.innerHTML = 'Price / <span style="color:#2cff7a">MC</span>';
      } else {
        priceMcapTogglerRef.current.innerHTML = '<span style="color:#2cff7a">Price</span> / MC';
      }
    }

    // Show dev trades toggle
    if (devTradesTogglerRef.current) {
      if (config.showDevTrades) {
        devTradesTogglerRef.current.textContent = 'Hide Dev Trades';
      } else {
        devTradesTogglerRef.current.textContent = 'Show Dev Trades';
      }
    }

    // Show user trades toggle
    if (userTradesTogglerRef.current) {
      if (config.showUserTrades) {
        userTradesTogglerRef.current.textContent = 'Hide My Trades';
      } else {
        userTradesTogglerRef.current.textContent = 'Show My Trades';
      }
    }
  }

  // Reset chart data when config changes
  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) {
      return;
    }

    let activeChart: IChartWidgetApi | undefined;
    try {
      activeChart = widget.activeChart();
    } catch (err) {
      console.error('failed to get active chart, breaking');
      return;
    }

    const ready = isLoaded && isDataReady;
    if (!activeChart || !ready || !symbol || !chartConfig) {
      return;
    }

    const baseAssetId = baseAssetRef.current?.id;
    if (!baseAssetId) {
      console.error('failed to reset data, missing asset id');
      return;
    }

    updateButtonTitles(chartConfig);
    const key = baseAssetRef.current?.id;
    if (!key) {
      console.error('failed to get token id, breaking');
      return;
    }
    // invalidate cache if it exists to request for new data
    // see https://www.tradingview.com/charting-library-docs/latest/connecting_data/datafeed-api/required-methods/#subscribebars
    const onResetCacheNeededCallback = resetCacheFnRef.current[key];
    if (!onResetCacheNeededCallback) {
      return;
    }

    onResetCacheNeededCallback();
    activeChart.resetData();
  }, [chartConfig, isLoaded, isDataReady, isTokenDataReady, baseAssetRef]);

  return (
    <TradingViewLoader fallback={<Spinner />}>
      {() => (
        <>
          <RefreshMarks isLoaded={isLoaded} widgetRef={widgetRef} />

          <div
            className={cn('relative h-full w-full flex-1 overflow-hidden transition-all')}
            style={{ minHeight: 200, ...style }}
          >
            {/* Shades to prevent flickering */}
            <div
              className={cn(
                `pointer-events-none absolute left-0 top-0 h-full w-full transition-all`,
                isLoaded && isDataReady ? 'bg-transparent' : `bg-black`,
                `flex items-center justify-center`
              )}
            >
              {!isLoaded || !isDataReady ? <Spinner /> : null}
            </div>

            <div
              id={htmlId}
              className={cn('h-full w-full', isDataReady ? `opacity-100` : `opacity-0`)}
              style={{ minHeight: 200, ...style }}
            />
          </div>
        </>
      )}
    </TradingViewLoader>
  );
});

TokenChart.displayName = 'TokenChart';