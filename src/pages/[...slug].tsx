import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import PillButton from '@/components/ui/PillButton';

export default function CatchAllPage() {
  const router = useRouter();
  const [isValidRoute, setIsValidRoute] = useState(false);

  useEffect(() => {
    // Check if this is a valid route by trying to match against known routes
    const validRoutes = [
      '/',
      '/launch',
      '/rewards',
      '/fees',
      '/privacy',
      '/tos'
    ];

    const currentPath = router.asPath;
    const isValid = validRoutes.includes(currentPath) ||
                   currentPath.startsWith('/coin/') ||
                   currentPath.startsWith('/profile/') ||
                   currentPath.startsWith('/admin/');

    setIsValidRoute(isValid);

    // If it's not a valid route, we'll show the 404 page
  }, [router.asPath]);

  // If it's a valid route, don't render anything (let Next.js handle it normally)
  if (isValidRoute) {
    return null;
  }

  // Show custom 404 page for invalid routes
  return (
    <>
      <Head>
        <title>404 - Page Not Found | launchpad.fun</title>
        <meta name="description" content="The page you're looking for doesn't exist." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0B0F13', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '2rem',
        transform: 'translateY(-10%)'
      }}>
        {/* 404 Image */}
        <div style={{ marginBottom: '1.5rem' }}>
          <img 
            src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
            alt="404 Error" 
            style={{
              maxWidth: '200px',
              width: '100%',
              height: 'auto'
            }}
          />
        </div>

        {/* Error Message */}
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            marginBottom: '0.75rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            404
          </h1>
          
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            marginBottom: '0.75rem',
            color: '#e2e8f0'
          }}>
            Page Not Found
          </h2>
          
          <p style={{ 
            marginBottom: '1.5rem', 
            color: '#94a3b8',
            fontSize: '1rem',
            lineHeight: '1.5'
          }}>
            The page you're looking for doesn't exist.
            Maybe it got lost in the sauce?
          </p>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <PillButton 
              as="a" 
              href="/" 
              theme="green"
              size="md"
              className="font-bold"
            >
              Go Home
            </PillButton>
          </div>


        </div>
      </div>
    </>
  );
}

export async function getStaticPaths() {
  return {
    paths: [] as string[],
    fallback: 'blocking'
  };
}

export async function getStaticProps() {
  return {
    props: {}
  };
}
