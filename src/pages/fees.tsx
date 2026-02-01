import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import BackArrowIcon from '@/icons/BackArrowIcon';

export default function FeesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0B0F13] text-white">
      <Head>
        <title>Fee Structure | launchpad.fun</title>
        <meta name="description" content="Fee structure for launchpad.fun - a comprehensive decentralized memecoin launch platform" />
      </Head>

      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="text-white hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10"
            >
              <BackArrowIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">Fee Structure</h1>
            <p className="text-white text-sm mt-1">Effective Date: August 22nd, 2025</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pb-24">
        <div className="space-y-8">

          {/* Introduction */}
          <section className="space-y-4">
            <p className="text-white leading-relaxed">
              <span className="text-primary font-semibold">launchpad.fun</span> operates on a transparent fee structure designed to support creators, maintain platform infrastructure, and ensure sustainable operations. All fees are clearly disclosed and subject to change with notice.
            </p>
          </section>

          {/* Fee Sections */}
          <div className="space-y-8">
            {/* On Bonding Curve Section */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">1. On Bonding Curve</h2>

              <h3 className="text-lg font-semibold text-white mt-4">Fee Structure</h3>
              <ul className="space-y-2 ml-6">
                <li className="text-white">• <strong>Coin creation:</strong> 0.024 SOL (includes transaction & DBC fees)</li>
                <li className="text-white">• <strong>Creator royalties:</strong> 0-5% (set by creator, collected on all trades)</li>
                <li className="text-white">• <strong>Platform royalties:</strong> 0.6% (collected on all buys and sells)</li>
                <li className="text-white">• <strong>Meteora royalties:</strong> Dynamic: 0.2-1.2% (collected on all buys and sells)</li>
              </ul>
            </section>

            {/* After Migration Section */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">2. After Migration to AMM</h2>

              <h3 className="text-lg font-semibold text-white mt-4">Fee Structure</h3>
              <ul className="space-y-2 ml-6">
                <li className="text-white">• <strong>Migration fee:</strong> 3.32 SOL (collected from bonding curve, split between creator and platform)</li>
                <li className="text-white">• <strong>Creator royalties:</strong> 0-5% (set by creator, collected on all trades)</li>
                <li className="text-white">• <strong>Platform royalties:</strong> 0.6% (collected on all buys and sells)</li>
                <li className="text-white">• <strong>Meteora royalties:</strong> Dynamic: 0.2-1.2% (collected on all buys and sells)</li>

              </ul>
            </section>

            <p className="text-white mt-4">
              <strong>Creator Control:</strong> Creator royalties are set by individual coin creators and can range from 0% to 5%. This allows creators to choose their preferred fee structure.
            </p>
            <p className="text-white mt-4">
              <strong>Meteora Dynamic Fees:</strong> Meteora take 20% of the total fees collected.
            </p>
            <p className="text-white mt-4">
              <strong>Migration Benefits:</strong> After migration to AMM pools, platform fees remain at 0.6%, maintaining consistent fee structure while providing enhanced liquidity and trading capabilities through AMM pools.
            </p>

            {/* Additional Information */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">4. Additional Information</h2>

              <h3 className="text-lg font-semibold text-white mt-4">Fee Collection</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• All fees are collected automatically</li>
                <li className="text-white">• No manual fee collection required</li>
                <li className="text-white">• Transparent on-chain tracking</li>
                <li className="text-white">• Real-time fee distribution</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">Creator Benefits</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Full control over royalty rates</li>
                <li className="text-white">• Direct revenue from trading</li>
                <li className="text-white">• Transparent fee structure</li>
                <li className="text-white">• No hidden charges</li>
              </ul>

              <p className="text-white mt-4">
                <strong>Important:</strong> All fees are subject to change with notice. By using launchpad.fun, you agree to the current fee structure and terms. Creator royalties are set at the time of coin creation and cannot be changed after launch.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
