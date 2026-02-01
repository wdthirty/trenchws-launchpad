'use client';

import { LiFiWidget, WidgetConfig, ChainId } from '@lifi/widget';

interface LiFiSwapWidgetProps {
  className?: string;
}

export const widgetConfig: WidgetConfig = {
  integrator: 'Launchpaddotfun',
  // API key for increased rate limits (200 req/min vs 200 req/2hrs)
  // Add NEXT_PUBLIC_LIFI_API_KEY to your .env.local file
  apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY,
  fromChain: ChainId.ETH,
  // set destination chain to Optimism
  toChain: ChainId.SOL,
  // set source token to USDC (Polygon)
  fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  // set source token to USDC (Optimism)
  toToken: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  // set source token amount to 10 USDC (Polygon)
  fromAmount: 10,
  // set the destination wallet address
  variant: "compact",
  subvariant: "split",
  appearance: "dark",
  fee: 0.01,
  theme: {
    colorSchemes: {
      light: {
        palette: {
          primary: {
            main: "#5C67FF"
          },
          secondary: {
            main: "#F7C2FF"
          }
        }
      },
      dark: {
        palette: {
          primary: {
            main: "#fde047"
          },
          secondary: {
            main: "#ffcc00"
          },
          success: {
            main: "#2cff7a"
          },
          error: {
            main: "#ff5050"
          },
          background: {
            paper: "#21262d",
            default: "#0b0f13"
          },
          grey: {
            700: "#21262d",
            800: "#0b0f13"
          }
        }
      }
    },
    typography: {
      fontFamily: "Inter, sans-serif"
    },
    container: {
      borderRadius: "16px",
      height: "fit-content"
    }
  }
};

const LiFiSwapWidget: React.FC<LiFiSwapWidgetProps> = ({ className = '' }) => {
  return (
    <div className={className}>
      <LiFiWidget integrator="Launchpaddotfun" config={widgetConfig} />
    </div>
  );
};

export { LiFiSwapWidget };
export default LiFiSwapWidget;