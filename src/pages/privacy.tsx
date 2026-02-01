import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import BackArrowIcon from '@/icons/BackArrowIcon';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0B0F13] text-white">
      <Head>
        <title>Privacy Policy | launchpad.fun</title>
        <meta name="description" content="Privacy policy for launchpad.fun - a comprehensive decentralized memecoin launch platform" />
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
            <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
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
              At <span className="text-primary font-semibold">launchpad.fun</span>, we respect your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and protect any information you provide while using our comprehensive decentralized memecoin launch platform.
            </p>
          </section>

          {/* Privacy Sections */}
          <div className="space-y-8">
            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold text-white mt-4">Wallet Information</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Public wallet addresses</li>
                <li className="text-white">• Transaction history on our platform</li>
                <li className="text-white">• Trading activity and preferences</li>
                <li className="text-white">• Portfolio holdings and positions</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">Usage Data</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Pages visited and interaction timing</li>
                <li className="text-white">• Device and browser information</li>
                <li className="text-white">• Platform feature usage patterns</li>
                <li className="text-white">• Error logs and performance metrics</li>
              </ul>

              <p className="text-white mt-4">
                <strong>Note:</strong> We do not collect private keys, seed phrases, or any other sensitive wallet information. All wallet interactions are handled securely through Privy's non-custodial wallet integration.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">2. How We Use Your Data</h2>
              
              <h3 className="text-lg font-semibold text-white mt-4">Platform Functionality</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Display coin metrics and rankings</li>
                <li className="text-white">• Show trading history and portfolio</li>
                <li className="text-white">• Calculate rewards</li>
                <li className="text-white">• Enable trading and liquidity features</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">Service Improvement</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Monitor usage patterns</li>
                <li className="text-white">• Improve platform features</li>
                <li className="text-white">• Detect and prevent abuse</li>
                <li className="text-white">• Optimize performance</li>
              </ul>

              <p className="text-white mt-4">
                <strong>Purpose:</strong> All data collection is designed to enhance your experience on our platform and maintain a safe, transparent ecosystem for speculative digital collectibles.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">3. No Personal Identifiers</h2>
              <p className="text-white leading-relaxed">
                We do not collect your name, email, phone number, or other personally identifying information unless you voluntarily provide it (e.g., via feedback forms, support requests, or social media interactions). Our platform operates on a pseudonymous basis using wallet addresses as identifiers.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">4. Third-Party Services</h2>
              
              <h3 className="text-lg font-semibold text-white mt-4">Wallet Services</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Privy (non-custodial wallet integration)</li>
                <li className="text-white">• Solana RPC providers</li>
                <li className="text-white">• Jupiter (trading aggregation)</li>
                <li className="text-white">• Meteora (liquidity protocols)</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">Analytics & Tools</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Plausible Analytics</li>
                <li className="text-white">• Google Analytics</li>
                <li className="text-white">• Error tracking services</li>
                <li className="text-white">• Performance monitoring</li>
              </ul>

              <p className="text-white mt-4">
                <strong>Important:</strong> We are not responsible for the data practices of external platforms. Each third-party service has its own privacy policy and terms of service that govern how they handle your information.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">5. Data Security</h2>
              
              <h3 className="text-lg font-semibold text-white mt-4">Security Measures</h3>
              <ul className="space-y-2 ml-6">
                <li className="text-white">• Non-custodial architecture - we never hold your private keys</li>
                <li className="text-white">• Encrypted data transmission and storage</li>
                <li className="text-white">• Regular security audits and updates</li>
                <li className="text-white">• Access controls and authentication protocols</li>
              </ul>

              <p className="text-white mt-4">
                <strong>Disclaimer:</strong> While we implement reasonable security practices, no system is fully secure. All blockchain interactions occur through your own wallet — we do not hold private keys or funds.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">6. Cookies & Analytics</h2>
              <p className="text-white leading-relaxed">
                launchpad.fun may use cookies and analytics tools (like Plausible or Google Analytics) to understand platform usage and improve user experience. These tools do not collect personal data, only anonymized metrics such as page views, session duration, and feature usage patterns.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">7. Your Rights</h2>
              
              <h3 className="text-lg font-semibold text-white mt-4">Control Your Data</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• Disconnect your wallet at any time</li>
                <li className="text-white">• Request removal of off-chain data</li>
                <li className="text-white">• Opt out of analytics tracking</li>
                <li className="text-white">• Access your stored information</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">Limitations</h3>
              <ul className="space-y-1 ml-6">
                <li className="text-white">• On-chain data cannot be deleted</li>
                <li className="text-white">• Some data required for platform operation</li>
                <li className="text-white">• Legal compliance requirements</li>
                <li className="text-white">• Security and fraud prevention</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">8. Data Retention</h2>
              <p className="text-white leading-relaxed">
                We retain your data only as long as necessary to provide our services and comply with legal obligations. Off-chain data may be deleted upon request, while on-chain transaction data is permanent and cannot be removed. Analytics data is typically retained for up to 2 years for service improvement purposes.
              </p>
            </section>

            {/* Section 9 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">9. Updates to This Policy</h2>
              <p className="text-white leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. Changes will be posted on this page with an updated effective date. Continued use of launchpad.fun after changes are posted implies your acceptance of the updated privacy terms.
              </p>
            </section>

            {/* Section 10 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">10. Contact Us</h2>
              <p className="text-white">
                For any questions about this Privacy Policy or to exercise your data rights, reach out to us at:{' '}
                <a 
                  href="mailto:contact@launchpad.fun" 
                  className="text-white hover:text-white underline transition-colors duration-200 font-medium"
                >
                  contact@launchpad.fun
                </a>
              </p>
              <p className="text-white">
                For urgent privacy or security concerns, please include "PRIVACY" in the subject line.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
