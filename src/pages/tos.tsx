import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import BackArrowIcon from '@/icons/BackArrowIcon';

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0B0F13] text-white">
      <Head>
        <title>Terms of Service | launchpad.fun</title>
        <meta name="description" content="Terms of service for launchpad.fun - a comprehensive decentralized memecoin launch platform" />
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
            <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
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
              Welcome to <span className="text-primary font-semibold">launchpad.fun</span>, a comprehensive decentralized memecoin launch platform built on Solana. By accessing or using launchpad.fun (the "Platform"), you agree to be bound by the following Terms of Service ("Terms"). Please read these Terms carefully. If you do not agree, do not use the Platform.
            </p>
          </section>

          {/* Terms Sections */}
          <div className="space-y-8">
            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
              <ul className="space-y-2 ml-6">
                <li className="text-white">• You understand the risks of using blockchain-based services and DeFi protocols.</li>
                <li className="text-white">• You have read, understood, and agreed to these Terms and our Privacy Policy.</li>
                <li className="text-white">• You are responsible for maintaining the security of your wallet and private keys.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">2. Platform Services</h2>
              <p className="text-white">launchpad.fun provides a comprehensive suite of services including:</p>
              
              <h3 className="text-lg font-semibold text-white mt-4">Coin Launch & Discovery</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Launch new memecoins via Dynamic Bonding Curves</li>
                <li className="text-white">• Discover and explore trending coins</li>
                <li className="text-white">• Real-time coin listings and metrics</li>
                <li className="text-white">• Multi-launchpad support (pump.fun, daos.fun, etc.)</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">Trading & Liquidity</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Seamless coin trading via Jupiter integration</li>
                <li className="text-white">• Liquidity pool creation and management</li>
                <li className="text-white">• Portfolio tracking and position management</li>
                <li className="text-white">• Advanced trading charts and analytics</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">Rewards & Incentives</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Creator rewards for successful coin launches</li>
                <li className="text-white">• Trading rewards programs</li>
                <li className="text-white">• Leaderboard competitions</li>
                <li className="text-white">• Fee sharing and revenue distribution</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">Analytics & Tools</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Real-time market data and price feeds</li>
                <li className="text-white">• Risk assessment and detection tools</li>
                <li className="text-white">• Wallet distribution analysis</li>
                <li className="text-white">• Trading pattern recognition</li>
              </ul>

              <p className="text-white mt-4">
                <strong>Platform Architecture:</strong> We are a non-custodial, fully on-chain platform — we do not hold your funds, manage your private keys, or intervene in token mechanics. We use Privy as our wallet provider to provide secure non-custodial wallet integration. All transactions are executed directly on the Solana blockchain through your own wallet.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">3. No Investment Advice & Regulatory Disclaimers</h2>
              
              <p className="text-white leading-relaxed">
                All content on launchpad.fun is for informational and entertainment purposes only. Nothing on the Platform constitutes financial, legal, or investment advice. You are solely responsible for evaluating and assuming the risks of your participation in any token or trading activity. Past performance does not indicate future results.
              </p>
              
              <h3 className="text-lg font-semibold text-white mt-4">Nature of Coins & Regulatory Status</h3>
              <p className="text-white leading-relaxed">
                All coins created and traded on launchpad.fun are <strong>speculative digital collectibles</strong> with no intrinsic value. For the purposes of these Terms, "coins" and "tokens" bear the same meaning. These coins are <strong>NOT currencies, securities, or investment instruments</strong>. They are purely for entertainment and community engagement purposes. Users should have <strong>NO expectation of returns, profits, or financial gains</strong> from participating in coin activities on our platform.
              </p>


              <h3 className="text-lg font-semibold text-white mt-4">Legal & Regulatory Compliance</h3>
              <p className="text-white leading-relaxed">
                By using launchpad.fun, you acknowledge that our platform operates as an <strong>entertainment and community service</strong>, not a financial services platform. We are not subject to securities laws, cryptocurrency regulations, or financial services oversight. All activities on our platform are conducted for entertainment purposes only, and we make no representations regarding compliance with any financial regulatory frameworks.
              </p>

              <h3 className="text-lg font-semibold text-white mt-4">Third-Party Platform Discovery</h3>
              <p className="text-white leading-relaxed">
                launchpad.fun provides discovery and access to coins from other launchpads and platforms. We <strong>bear no responsibility</strong> for what users create or do on those third-party platforms. We do not endorse, verify, or validate any coins, projects, or activities on external platforms. Users are solely responsible for their interactions with third-party platforms and should conduct their own due diligence.
              </p>

              <h3 className="text-lg font-semibold text-white mt-4">Wallet Integration & Security</h3>
              <p className="text-white leading-relaxed">
                launchpad.fun integrates with Privy, a third-party wallet provider that offers secure non-custodial wallet services. While we use Privy's technology for wallet integration, we do not control, manage, or have access to your private keys or wallet contents. You are solely responsible for the security of your wallet and any transactions conducted through it. Privy's services are subject to their own terms of service and privacy policy.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">4. Risk Disclosure</h2>
              
              <p className="text-white leading-relaxed">
                <strong>IMPORTANT:</strong> All coins on launchpad.fun are speculative digital collectibles with no intrinsic value. While these collectibles may be traded for entertainment purposes, they are NOT investments and carry no expectation of returns. You may lose all value associated with these collectibles. Additionally, while launchpad.fun provides risk metrics and detection tools, we do not guarantee the legitimacy or future performance of any launched coin or trading activity.
              </p>
              
              <p className="text-white font-medium">Key Risks Include:</p>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Complete loss of collectible value (coins have no intrinsic worth)</li>
                <li className="text-white">• Smart contract vulnerabilities and technical bugs</li>
                <li className="text-white">• Platform discontinuation or service changes</li>
                <li className="text-white">• Loss of access to wallet or private keys</li>
              </ul>
              
              <p className="text-white font-medium">
                Remember: These are speculative digital collectibles for entertainment only. Never spend more than you can afford to lose on any platform activity.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">5. Prohibited Use</h2>
              <p className="text-white">You agree not to use launchpad.fun to:</p>
              <ul className="space-y-2 ml-6">
                <li className="text-white">• Launch coins with malicious or fraudulent intent</li>
                <li className="text-white">• Engage in market manipulation, wash trading, or spam</li>
                <li className="text-white">• Violate any applicable laws or regulations</li>
                <li className="text-white">• Upload harmful content (e.g., malware, hate speech, illegal material)</li>
                <li className="text-white">• Attempt to exploit platform vulnerabilities or bugs</li>
                <li className="text-white">• Interfere with other users' access to the platform</li>
              </ul>
              <p className="text-white">
                Violations may result in restrictions, bans from the Platform, or legal action.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">6. Platform Features & Data</h2>
              <p className="text-white">We provide comprehensive analytics and tools to support informed decision-making:</p>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Wallet distribution analysis</li>
                <li className="text-white">• Real-time liquidity tracking</li>
                <li className="text-white">• Volume and trading metrics</li>
                <li className="text-white">• Price impact calculations</li>
                <li className="text-white">• Trading anomaly detection</li>
                <li className="text-white">• Portfolio performance tracking</li>
              </ul>
              <p className="text-white">
                These tools are informational and educational. They are not guarantees of safety, legitimacy, or future performance. Always conduct your own research and due diligence.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">7. User Responsibilities</h2>
              <p className="text-white">As a user of launchpad.fun, you are responsible for:</p>
              <ul className="space-y-2 ml-6">
                <li className="text-white">• Securing your wallet and private keys</li>
                <li className="text-white">• Verifying transaction details before confirming</li>
                <li className="text-white">• Understanding the risks of DeFi protocols</li>
                <li className="text-white">• Compliance with applicable tax obligations</li>
                <li className="text-white">• Reporting suspicious activity or bugs</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">8. Limitation of Liability</h2>
              <p className="text-white">To the maximum extent permitted by law, launchpad.fun and its team will not be liable for:</p>
              <ul className="space-y-2 ml-6">
                <li className="text-white">• Any losses or damages arising from your use of the Platform</li>
                <li className="text-white">• Smart contract bugs, vulnerabilities, or exploits</li>
                <li className="text-white">• Misuse of third-party wallets or services</li>
                <li className="text-white">• Network congestion or blockchain failures</li>
                <li className="text-white">• Data accuracy or availability issues</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">9. Modifications</h2>
              <p className="text-white leading-relaxed">
                We reserve the right to modify these Terms at any time. Changes take effect immediately upon posting. Continued use of the Platform means you accept the updated Terms. We will notify users of significant changes through the Platform or other reasonable means.
              </p>
            </section>

            {/* Section 10 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">10. Contact</h2>
              <p className="text-white">
                For questions, support, or to report issues, reach out to us at:{' '}
                <a 
                  href="mailto:contact@launchpad.fun" 
                  className="text-white hover:text-white underline transition-colors duration-200 font-medium"
                >
                  contact@launchpad.fun
                </a>
              </p>
              <p className="text-white">
                For urgent security issues, please include "SECURITY" in the subject line.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
