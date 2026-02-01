import { NextApiRequest, NextApiResponse } from 'next';
import { ImageResponse } from 'next/og';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
            left: '100px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '20px'
          }}>
            <span style={{
              fontSize: '80px',
              fontWeight: 900,
              color: '#fed703',
              textShadow: '0 0 2px rgba(254,215,3,0.8), 0 0 4px rgba(254,215,3,0.4)',
              letterSpacing: '-2px'
            }}>Launch.</span>
            <span style={{
              fontSize: '80px',
              fontWeight: 900,
              color: 'white',
              textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.4)',
              letterSpacing: '-2px'
            }}>Earn.</span>
          </div>

          <div style={{
            position: 'absolute',
            right: '100px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '20px'
          }}>
            <span style={{
              fontSize: '80px',
              fontWeight: 900,
              color: '#fed703',
              textShadow: '0 0 2px rgba(254,215,3,0.8), 0 0 4px rgba(254,215,3,0.4)',
              letterSpacing: '-2px'
            }}>Trade.</span>
            <span style={{
              fontSize: '80px',
              fontWeight: 900,
              color: 'white',
              textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.4)',
              letterSpacing: '-2px'
            }}>Repeat.</span>
          </div>

          <div style={{
            position: 'absolute',
            bottom: '40px',
            right: '100px',
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
