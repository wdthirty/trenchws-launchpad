import { NextApiRequest, NextApiResponse } from 'next';
import { ImageResponse } from 'next/og';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  if (!username || Array.isArray(username)) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  // Create a new pool connection for this request
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  let userPnl = '0.00';
  let coinsCreated = '0';
  let coinsGraduated = '0';
  let pnlColor = '#fed703'; // Default yellow

  // Get user data and stats using the same approach as the profile page
  try {
    const { findUserByTwitterUsername, getUserTotalPnl } = await import('@/lib/database');
    
    const user = await findUserByTwitterUsername(pool, username);
    if (user) {
      coinsCreated = user.coinsCreated?.toString() || '0';
      coinsGraduated = user.coinsGraduated?.toString() || '0';
      
      // Get PnL using wallet address
      const totalPnl = await getUserTotalPnl(user.privyWalletAddress, pool);
      userPnl = totalPnl ? Number(totalPnl).toFixed(2) : '0.00';
      
      // Set color based on PnL value
      const pnlValue = Number(totalPnl || 0);
      if (Math.abs(pnlValue) < 0.001) {
        pnlColor = '#ffffff'; // White for zero
      } else if (pnlValue >= 0) {
        pnlColor = '#2cff7a'; // emerald.DEFAULT for positive
      } else {
        pnlColor = '#ff5050'; // rose.DEFAULT for negative
      }
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  } finally {
    // Close the pool connection
    await pool.end();
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
            top: '60px',
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
            right: '80px',
            top: '53%',
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
              letterSpacing: '-1px'
            }}>Look! I'm Flexing!</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{
                fontSize: '64px',
                fontWeight: 900,
                color: 'white',
                textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.4)',
                letterSpacing: '-1px'
              }}>@{username}</span>
              <span style={{
                fontSize: '48px',
                fontWeight: 700,
                color: pnlColor,
                textShadow: `0 0 2px ${pnlColor}80, 0 0 4px ${pnlColor}40`,
                letterSpacing: '-0.5px'
              }}>PnL: {userPnl} SOL</span>
              {(parseInt(coinsCreated) > 0 || parseInt(coinsGraduated) > 0) && (
                <div style={{ display: 'flex', gap: '40px' }}>
                  {parseInt(coinsCreated) > 0 && (
                    <span style={{
                      fontSize: '36px',
                      fontWeight: 700,
                      color: 'white',
                      textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.4)',
                      letterSpacing: '-0.5px'
                    }}>Launched: {coinsCreated}</span>
                  )}
                  {parseInt(coinsGraduated) > 0 && (
                    <span style={{
                      fontSize: '36px',
                      fontWeight: 700,
                      color: 'white',
                      textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.4)',
                      letterSpacing: '-0.5px'
                    }}>Graduated: {coinsGraduated}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '40px', right: '160px', fontSize: '24px', color: '#DEDEDE' }}>Check out my profile on launchpad.fun</div>
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
    console.error('Error generating OG image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
}
