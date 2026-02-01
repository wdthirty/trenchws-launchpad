import Explore from '@/components/Explore';
import Page from '@/components/ui/Page/Page';
import Head from 'next/head';

export default function Index() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  return (
    <>
      <Head>
        <title>launchpad.fun</title>
        <meta name="description" content="Launch, trade, and discover the next big memecoins on Solana." />
        
        <meta property="og:title" content="launchpad.fun" />
        <meta property="og:description" content="Launch, trade, and discover the next big memecoins on Solana." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={baseUrl} />
        <meta property="og:image" content={`${baseUrl}/api/og/home/opengraph`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="launchpad.fun" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="launchpad.fun" />
        <meta name="twitter:description" content="Launch, trade, and discover the next big memecoins on Solana." />
        <meta name="twitter:image" content={`${baseUrl}/api/og/home/twitter`} />
        <meta name="twitter:image:alt" content="launchpad.fun" />
      </Head>
      <Page>
        <Explore />
      </Page>
    </>
  );
}
