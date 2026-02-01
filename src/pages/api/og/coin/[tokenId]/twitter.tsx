import { NextApiRequest, NextApiResponse } from 'next';
import { ImageResponse } from 'next/og';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenId } = req.query;
  const { symbol, icon } = req.query;

  if (!tokenId || Array.isArray(tokenId)) {
    return res.status(400).json({ error: 'Invalid tokenId' });
  }

  let tokenSymbol = Array.isArray(symbol) ? symbol[0] : symbol || 'COIN';
  let tokenIcon = Array.isArray(icon) ? icon[0] : icon || '';
  let tokenName = Array.isArray(req.query.name) ? req.query.name[0] : req.query.name || '';

  // Fetch token info by tokenId so the image renders with data for crawlers
  try {
    const res = await fetch(
      `https://datapi.jup.ag/v1/pools?assetIds=${encodeURIComponent(tokenId)}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'launchpad.fun/1.0'
        }
      }
    );
    if (res.ok) {
      const data = await res.json();
      const pool = Array.isArray(data?.pools) ? data.pools[0] : undefined;
      const base = pool?.baseAsset;
      if (base) {
        if (!symbol && base.symbol) tokenSymbol = base.symbol;
        if (!icon && base.icon) tokenIcon = base.icon;
        if (!req.query.name && base.name) tokenName = base.name;
      }
    }
  } catch (error) {
    console.error('Error fetching token data for Twitter image:', error);
  }

  try {
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            background: 'url(https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '100px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <img
              src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora"
              alt="launchpad.fun logo"
              width={40}
              height={40}
              style={{ borderRadius: '12px' }}
            />
            <span style={{
              fontSize: '36px',
              fontWeight: 900,
              color: 'white',
              textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.4)',
              letterSpacing: '-1px'
            }}>launchpad.fun</span>
          </div>

          <div style={{
            position: 'absolute',
            left: '100px',
            top: '60%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '50px'
          }}>
            {tokenIcon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tokenIcon} alt={tokenSymbol} width={240} height={240} style={{ borderRadius: '20px', objectFit: 'cover', border: '3px solid #ffffff' }} />
            ) : (
              <div
                style={{
                  width: '200px',
                  height: '200px',
                  background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '64px',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {tokenSymbol.charAt(0)}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginTop: '-30px' }}>
              <span style={{
                fontSize: '100px',
                fontWeight: 900,
                color: '#fed703',
                textShadow: '0 0 2px rgba(254,215,3,0.8), 0 0 4px rgba(254,215,3,0.4)',
                letterSpacing: '-1px'
              }}>${tokenSymbol}</span>
              {tokenName && (
                <span style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: 'white',
                  textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.4)',
                  letterSpacing: '-0.5px'
                }}>{tokenName}</span>
              )}
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '40px', fontSize: '24px', color: '#DEDEDE' }}>Trade memes. Earn Rewards. Repeat.</div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );

    const buffer = await imageResponse.arrayBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error generating Twitter image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
}
