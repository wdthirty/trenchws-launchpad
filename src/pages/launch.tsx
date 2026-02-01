import { useState, useRef, lazy, Suspense } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import Page from '@/components/ui/Page/Page';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/contexts/UserProvider';
import { useSignTransaction, useSendTransaction } from '@privy-io/react-auth/solana';
import { ExternalWalletTransactionBuilder } from '@/lib/services/external-wallet/transaction-builder.service';
import { cn } from '@/lib/utils';
import { CustomTextField } from '@/components/ui/CustomTextField';
import { AnimatePresence, motion } from 'framer-motion';
import { appThemes } from '@/components/TokenHeader/themes';
import { PillButton } from '@/components/ui/PillButton';
import { GetServerSideProps } from 'next';

// Lazy load heavy components
const LogoBackground = lazy(() => import('@/components/LogoBackground'));

// Lightweight validation functions
const validateForm = (values: FormValues): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Token name validation
  if (!values.tokenName || values.tokenName.length < 3) {
    errors.tokenName = 'Coin name must be at least 3 characters';
  }

  // Token symbol validation
  if (!values.tokenSymbol || values.tokenSymbol.length < 1) {
    errors.tokenSymbol = 'Coin symbol is required';
  }

  // Token logo validation
  if (!values.tokenLogo) {
    errors.tokenLogo = 'Coin logo is required';
  } else if (values.tokenLogo instanceof File) {
    // Check file size directly
    const sizeInMB = values.tokenLogo.size / (1024 * 1024);
    
    if (sizeInMB > 2) {
      errors.tokenLogo = 'Image must be less than 2MB';
    }
  }

  // Website validation (optional)
  if (values.website && values.website !== '') {
    let websiteUrl = values.website;
    
    // Auto-prepend https:// if not present
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      websiteUrl = 'https://' + websiteUrl;
    }
    
    try {
      new URL(websiteUrl);
    } catch {
      errors.website = 'Please enter a valid website URL';
    }
  }

  // Twitter validation (optional)
  if (values.twitter && values.twitter !== '') {
    let twitterUrl = values.twitter;
    
    // Auto-prepend https:// if not present
    if (!twitterUrl.startsWith('http://') && !twitterUrl.startsWith('https://')) {
      twitterUrl = 'https://' + twitterUrl;
    }
    
    try {
      const url = new URL(twitterUrl);
      // Validate that it's a valid Twitter/X URL
      if (!url.hostname.includes('x.com') && !url.hostname.includes('twitter.com')) {
        errors.twitter = 'X URL must start with x.com or twitter.com';
      }
    } catch {
      errors.twitter = 'Please enter a valid X URL';
    }
  }

  // Telegram validation (optional)
  if (values.telegram && values.telegram !== '') {
    let telegramUrl = values.telegram;
    
    // Auto-prepend https:// if not present
    if (!telegramUrl.startsWith('http://') && !telegramUrl.startsWith('https://')) {
      telegramUrl = 'https://' + telegramUrl;
    }
    
    try {
      const url = new URL(telegramUrl);
      // Validate that it's a valid Telegram URL
      if (!url.hostname.includes('t.me')) {
        errors.telegram = 'Telegram URL must start with t.me';
      }
    } catch {
      errors.telegram = 'Please enter a valid Telegram URL';
    }
  }

  // Tagged username validation - prevent self-tagging
  if (values.xUserHandle && values.xUserHandle !== '') {
    // This validation will be handled in the form submission since we need access to user context
  }

  // Total supply validation
  if (values.totalSupply) {
    // Remove all thousand separators (both , and . and space) to handle international formats
    const cleanVal = values.totalSupply.replace(/[,.\s]/g, '').replace(/\D/g, '');
    if (!cleanVal || cleanVal === '') {
      errors.totalSupply = 'Total supply is required';
    } else {
      const num = parseInt(cleanVal);
      if (isNaN(num)) {
        errors.totalSupply = 'Please enter a valid number';
      } else if (num < 1000000) {
        errors.totalSupply = 'Total supply must be at least 1 million';
      } else if (num > 1000000000000) {
        errors.totalSupply = 'Total supply must be at most 1 trillion';
      }
    }
  }

  // Creator fee validation
  if (!['0', '1', '2', '3', '4', '5'].includes(values.creatorFee || '')) {
    errors.creatorFee = 'Creator fee must be 0%, 1%, 2%, 3%, 4%, or 5%';
  }

  return errors;
};

interface FormValues {
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  tokenLogo: File | undefined;
  website?: string;
  twitter?: string;
  telegram?: string;
  preBuy?: string;
  burnPercentage?: string;
  xUserHandle?: string;
  totalSupply?: string;
  creatorFee?: string;
  category?: string;
}

export default function CreatePool() {
  const { publicKey, privyWalletId, twitterUsername, walletType } = useUser();
  const { signTransaction } = useSignTransaction();
  const { sendTransaction } = useSendTransaction();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [poolCreated, setPoolCreated] = useState(false);
  const [createdCoinCA, setCreateCoinCA] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [createdCoinName, setCreatedCoinName] = useState<string | null>(null);
  const [createdCoinSymbol, setCreatedCoinSymbol] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isSocialLinksExpanded, setIsSocialLinksExpanded] = useState(false);
  const [isDevSettingsExpanded, setIsDevSettingsExpanded] = useState(false);

  const PoolCreationSuccess = () => (
    <motion.div 
      className="max-w-md mx-auto bg-[#0B0F13]/95 border border-slate-600/30 rounded-xl p-8 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="iconify ph--check-bold w-8 h-8 text-green-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2 text-white">{createdCoinName}</h2>
      <p className="text-lg font-semibold text-primary mb-4">{createdCoinSymbol}</p>
      <p className="text-slate-400 mb-6 text-sm">
        Your coin is now live! Start sharing the word and earn rewards.
      </p>
      <div className="flex flex-col gap-3">
        <PillButton
          onClick={() => {
            // Navigate directly to the coin page using the coin address
            router.push(`/coin/${createdCoinCA}`);
          }}
          theme="green"
          size="lg"
        >
          View Your Coin
        </PillButton>
        <PillButton
          href="/"
          as="a"
          theme="ghost"
          size="lg"
        >
          Back to Explore
        </PillButton>
      </div>
    </motion.div>
  );

  const form = useForm({
    defaultValues: {
      tokenName: '',
      tokenSymbol: '',
      tokenDescription: '',
      tokenLogo: undefined,
      website: '',
      twitter: '',
      telegram: '',
      preBuy: '0',
      burnPercentage: '0',
      xUserHandle: '',
      totalSupply: '1000000000',
      creatorFee: '1',
      category: ''
    } as FormValues,
    onSubmit: async ({ value }) => {
      try {
        setIsLoading(true);
        const { tokenLogo } = value;

        if (!tokenLogo) {
          toast.error('Coin Logo is Required');
          return;
        }

        // Check if user is trying to tag themselves
        if (value.xUserHandle && value.xUserHandle !== '') {
          if (twitterUsername && value.xUserHandle.toLowerCase() === twitterUsername.toLowerCase()) {
            toast.error('You cannot tag yourself to share fees. Please enter a different X username.');
            setIsLoading(false);
            return;
          }
        }

        if (!publicKey) {
          toast.error('Wallet not connected. Please connect your wallet first.');
          return;
        }

        // Validate that publicKey is properly constructed
        if (!publicKey.toBase58 || typeof publicKey.toBase58 !== 'function') {
          toast.error('Invalid wallet address. Please reconnect your wallet.');
          return;
        }

        const reader = new FileReader();
        const base64File = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(tokenLogo);
        });

        const lamportPreBuy = value.preBuy ? Math.floor(parseFloat(value.preBuy) * 1e9) : 0;

        // Auto-prepend https:// to social links if not present
        const formatSocialLink = (link: string | undefined) => {
          if (!link || link === '') return '';
          if (link.startsWith('http://') || link.startsWith('https://')) {
            return link;
          }
          return 'https://' + link;
        };

        // Choose the appropriate API endpoint based on wallet type
        const isExternalWallet = walletType === 'external';
        const apiEndpoint = isExternalWallet ? '/api/create-coin-external' : '/api/create-coin-with-config-v3';

        const requestBody = isExternalWallet ? {
          tokenLogo: base64File,
          tokenName: value.tokenName,
          tokenSymbol: value.tokenSymbol,
          tokenDescription: value.tokenDescription,
          userWalletAddress: publicKey.toBase58(),
          userTwitterHandle: twitterUsername || '',
          userTwitterId: '', // Could be extracted from user data
          website: formatSocialLink(value.website),
          twitter: formatSocialLink(value.twitter),
          telegram: formatSocialLink(value.telegram),
          preBuy: lamportPreBuy.toString(),
          burnPercentage: value.burnPercentage || '0',
          xUserHandle: value.xUserHandle,
          totalSupply: value.totalSupply || '1000000000',
          creatorFee: value.creatorFee || '1',
          category: value.category
        } : {
          tokenLogo: base64File,
          tokenName: value.tokenName,
          tokenSymbol: value.tokenSymbol,
          tokenDescription: value.tokenDescription,
          userWallet: publicKey,
          website: formatSocialLink(value.website),
          twitter: formatSocialLink(value.twitter),
          telegram: formatSocialLink(value.telegram),
          preBuy: lamportPreBuy.toString(),
          burnPercentage: value.burnPercentage || '0',
          walletId: privyWalletId || '',
          xUserHandle: value.xUserHandle,
          totalSupply: value.totalSupply || '1000000000',
          creatorFee: value.creatorFee || '1',
          category: value.category
        };

        const createCoinRes = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!createCoinRes.ok) {
          const error = await createCoinRes.json();
          toast.error('failed to create coin');
          console.error(error.error);
          return;
        }

        const response = await createCoinRes.json();
        
        if (isExternalWallet) {
          // Handle external wallet response
          const { success, stateId, transactionData, metadata } = response;
          
          if (!success || !transactionData) {
            toast.error(`Failed to prepare coin creation: ${response.error}`);
            return;
          }

          // Execute transactions using external wallet
          console.log('🚀 Executing blockchain transactions...');
          const userPublicKey = publicKey;
          const connection = new (await import('@solana/web3.js')).Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');
          const transactionBuilder = new ExternalWalletTransactionBuilder(connection, transactionData.authorityPrivateKey);
          
          const signatures = await transactionBuilder.executeTransactionsWithPrivy(
            transactionData,
            userPublicKey,
            signTransaction,
            sendTransaction,
            publicKey.toBase58()
          );

          // Notify backend of successful transaction execution
          console.log('📝 Notifying backend of transaction completion...');
          const executeRes = await fetch('/api/execute-external-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stateId,
              transactionSignatures: signatures
            }),
          });

          if (!executeRes.ok) {
            const error = await executeRes.json();
            toast.warning('Coin created but backend notification failed');
            console.error(error.error);
          }

          setCreateCoinCA(metadata.tokenCA);
          toast.success('Coin created successfully');
          setCreatedCoinName(value.tokenName);
          setCreatedCoinSymbol(value.tokenSymbol);
          setPoolCreated(true);
        } else {
          // Handle embedded wallet response (existing logic)
          const { success, tokenCA, partialSuccess, error } = response;
          
          if (!success || !tokenCA) {
            if (partialSuccess) {
              // Partial success - user gets their token but process failed
              toast.warning(`Coin created but process incomplete: ${error}`);
              setCreateCoinCA(tokenCA);
              setCreatedCoinName(value.tokenName);
              setCreatedCoinSymbol(value.tokenSymbol);
              setPoolCreated(true);
            } else {
              // Complete failure
              toast.error(`Failed to create coin: ${error}`);
            }
            return;
          }
          
          setCreateCoinCA(tokenCA);
          toast.success('Coin created successfully');
          setCreatedCoinName(value.tokenName);
          setCreatedCoinSymbol(value.tokenSymbol);
          setPoolCreated(true);
        }
      } catch (error) {
        console.error('🚨 Error creating coin:', error);
        toast.error(error instanceof Error ? error.message : 'failed to create coin');
      } finally {
        setIsLoading(false);
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const errors = validateForm(value);
        return Object.keys(errors).length > 0 ? errors : undefined;
      },
    },
  });

  return (
    <Page scrollable={true}>
      <Head>
        <title>Launch on launchpad.fun</title>
        <meta name="description" content="Create a new coin on launchpad.fun" />

      </Head>
      
      <Suspense fallback={null}>
        <LogoBackground />
      </Suspense>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-24" style={{ scrollBehavior: 'auto' }}>
        {poolCreated && !isLoading ? (
          <PoolCreationSuccess />
        ) : (
          <>
            {/* Main Container */}
            <div className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
              <AnimatePresence>
                {/* Header */}
                <motion.section 
                  key="launch-header"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-center space-y-3 sm:space-y-4"
                >
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Launch Your Coin</h1>
                  <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
                    Launch in seconds, earn rewards forever.
                  </p>
                </motion.section>

                {/* Form */}
                <motion.div
                  key="launch-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="space-y-6 sm:space-y-8"
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      form.handleSubmit();
                    }}
                    className="space-y-6 sm:space-y-8"

                  >
                    {/* Basic Info Section */}
                    <div className={`${appThemes.green.background} border ${appThemes.green.border} rounded-xl p-4 sm:p-6`}>
                      <h2 className={`text-lg font-semibold ${appThemes.green.text} mb-4`}>Coin Information</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Name */}
                        <div className="w-full">
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Name <span className="text-red-400">*</span>
                          </label>
                          {form.Field({
                            name: 'tokenName',
                            children: (field) => (
                              <CustomTextField
                                name={field.name}
                                type="text"
                                placeholder="Coin Name"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onClear={() => field.handleChange('')}
                                required
                                inputProps={{ minLength: 3, autoComplete: 'off' }}
                                theme="green"
                              />
                            ),
                          })}
                        </div>

                        {/* Symbol */}
                        <div className="w-full">
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Symbol <span className="text-red-400">*</span>
                          </label>
                          {form.Field({
                            name: 'tokenSymbol',
                            children: (field) => (
                              <CustomTextField
                                name={field.name}
                                type="text"
                                placeholder="Coin Ticker"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onClear={() => field.handleChange('')}
                                required
                                inputProps={{ maxLength: 10, autoComplete: 'off' }}
                                theme="green"
                              />
                            ),
                          })}
                        </div>

                        {/* Category */}
                        <div className="w-full">
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Category
                          </label>
                          {form.Field({
                            name: 'category',
                            children: (field) => (
                              <select
                                name={field.name}
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                autoComplete="off"
                                className={`w-full h-[40px] px-2  ${field.state.value == "" ? "bg-transparent" : "bg-[#0B0F13]/50"} border ${appThemes.green.border} rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-green-400/50 active:border-green-400/50 appearance-none [&>option]:bg-[#0B0F13] [&>option]:text-white [&>option]:hover:bg-slate-800`}
                                style={{
                                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'right 8px center',
                                  backgroundSize: '20px 20px',
                                  paddingRight: '40px'
                                }}
                              >
                                <option value="">Select a category</option>
                                <option value="Meme">Meme</option>
                                <option value="Art">Art</option>
                                <option value="Tech">Tech</option>
                                <option value="Fundraiser">Fundraise</option>
                              </select>
                            ),
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
                        {/* Logo */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Logo <span className="text-red-400">*</span>
                          </label>
                          <p className="text-xs text-slate-400 mb-2">Max 2MB</p>
                          {form.Field({
                            name: 'tokenLogo',
                            children: (field) => {
                              const handleFileUpload = (file: File) => {
                                const MAX_SIZE = 2 * 1024 * 1024;
                                if (file.size > MAX_SIZE) {
                                  toast.error('Logo must be less than 2MB!');
                                  return;
                                }
                                field.handleChange(file);
                                setLogoPreviewUrl(URL.createObjectURL(file));
                              };

                              return (
                                <div 
                                  className={`border border-dashed ${appThemes.green.border} rounded-md p-4 text-center cursor-pointer hover:${appThemes.green.borderHover} focus:border-green-400/50 active:border-green-400/50 transition-all duration-200 ${logoPreviewUrl ? 'bg-[#0B0F13]/50' : 'bg-transparent'}`}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const files = e.dataTransfer.files;
                                    if (files.length > 0 && files[0].type.startsWith('image/')) {
                                      handleFileUpload(files[0]);
                                    }
                                  }}
                                  onClick={() => {
                                    fileInputRef.current?.click();
                                  }}
                                >
                                  {logoPreviewUrl ? (
                                    <div className="space-y-4">
                                      <img
                                        src={logoPreviewUrl}
                                        alt="Review your logo"
                                        className="mx-auto h-32 w-32 rounded object-cover border border-slate-600/50"
                                      />
                                      <p className="text-xs text-slate-400">Click or drag to upload</p>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="iconify ph--upload w-6 h-6 mx-auto mb-2 text-slate-400" />
                                      <p className="text-xs text-slate-400">Click or drag to upload</p>
                                    </>
                                  )}
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    autoComplete="off"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileUpload(file);
                                    }}
                                  />
                                </div>
                              );
                            },
                          })}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Description
                        </label>
                        {form.Field({
                          name: 'tokenDescription',
                          children: (field) => (
                            <CustomTextField
                              name={field.name}
                              multiline
                              rows={3}
                              placeholder="Describe your coin..."
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onClear={() => field.handleChange('')}
                              inputProps={{ maxLength: 500, autoComplete: 'off' }}
                              theme="green"
                            />
                          ),
                        })}
                      </div>
                    </div>

                    {/* Creator Fee Sharing */}
                    {form.Field({
                      name: 'category',
                      children: (categoryField) => {
                        const isFundraiser = categoryField.state.value === 'Fundraiser';
                        const isTech = categoryField.state.value === 'Tech';
                        const isFeeSharingEnabled = isFundraiser || isTech;
                        
                        return (
                          <div className={`${appThemes.purple.background} border ${appThemes.purple.border} rounded-xl p-4 sm:p-6 relative group ${!isFeeSharingEnabled ? 'opacity-70' : ''}`}>
                            <div className="absolute top-6 right-6">
                              <div className="text-xs font-medium text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md w-fit text-center">
                                Tech & Fundraiser Only
                              </div>
                            </div>
                            <h2 className={`text-lg font-semibold ${appThemes.purple.text} mb-4`}>Share Fees</h2>
                            
                            {!isFeeSharingEnabled && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 bg-[#0B0F13]/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                                <div className="text-center p-4 max-w-xs pointer-events-auto">
                                  <p className="text-sm text-slate-300 mb-2">
                                    Set the category to <span className="font-bold text-purple-400">Tech</span> or <span className="font-bold text-purple-400">Fundraiser</span> to enable fee sharing.
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    This feature allows you to share trading fees with X users
                                  </p>
                                </div>
                              </div>
                            )}

                            
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Give Royalties to a X User
                              </label>
                              {form.Field({
                                name: 'xUserHandle',
                                children: (field) => {
                                  const displayValue = field.state.value ? `@${field.state.value}` : '';
                                  
                                  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                    let value = e.target.value;
                                    
                                    // Remove @ if user types it
                                    if (value.startsWith('@')) {
                                      value = value.substring(1);
                                    }
                                    
                                    // Remove any other @ symbols
                                    value = value.replace(/@/g, '');
                                    
                                    // Remove leading/trailing whitespace
                                    value = value.trim();
                                    
                                    // Only allow alphanumeric characters and underscores
                                    value = value.replace(/[^a-zA-Z0-9_]/g, '');
                                    
                                    // Convert to lowercase for consistency
                                    value = value.toLowerCase();
                                    
                                    field.handleChange(value);
                                  };

                                  // Validate username length
                                  const validateUsername = (username: string) => {
                                    if (!username || username === '') return null;
                                    if (username.length < 4) return 'X username must be at least 4 characters';
                                    if (username.length > 15) return 'X username must be at most 15 characters';
                                    return null;
                                  };

                                  const validationError = validateUsername(field.state.value);

                                  return (
                                    <div>
                                      <CustomTextField
                                        name={field.name}
                                        type="text"
                                        placeholder="@username"
                                        value={displayValue}
                                        onChange={handleChange}
                                        onClear={() => field.handleChange('')}
                                        inputProps={{ maxLength: 16, autoComplete: 'off' }}
                                        theme="purple"
                                      />
                                      {validationError && (
                                        <p className="text-xs text-red-400 mt-2">
                                          {validationError}
                                        </p>
                                      )}
                                      {field.state.value && twitterUsername && field.state.value.toLowerCase() === twitterUsername.toLowerCase() && (
                                        <p className="text-xs text-amber-400 mt-2">
                                          Note: You cannot tag yourself to share fees.
                                        </p>
                                      )}
                                    </div>
                                  );
                                },
                              })}
                              <p className="text-xs text-slate-500 mt-2">
                                All trading fees will be sent to the X user you designate here.
                              </p>
                            </div>
                          </div>
                        );
                      },
                    })}

                    {/* Custom Trading Fee */}
                    <div className={`${appThemes.blue.background} border ${appThemes.blue.border} rounded-xl p-4 sm:p-6`}>
                      <h2 className={`text-lg font-semibold ${appThemes.blue.text} mb-4`}>Coin Settings</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Total Supply */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Total Supply <span className="text-slate-500">(1M - 1T)</span>
                          </label>
                          {form.Field({
                            name: 'totalSupply',
                            children: (field) => {
                              // Normalize number input to handle international formats
                              const normalizeNumber = (input: string) => {
                                if (!input) return '';
                                // Remove all thousand separators (both , and . and space)
                                let cleaned = input.replace(/[,.\s]/g, '');
                                // Only keep digits
                                cleaned = cleaned.replace(/\D/g, '');
                                return cleaned;
                              };

                              // Format the display value with locale-appropriate separators
                              const formatNumber = (num: string) => {
                                if (!num) return '';
                                const cleanNum = normalizeNumber(num);
                                if (cleanNum === '') return '';
                                const parsed = parseInt(cleanNum);
                                if (isNaN(parsed)) return '';
                                // Use locale-specific formatting
                                return parsed.toLocaleString();
                              };

                              // Validate the current value
                              const validateValue = (val: string) => {
                                if (!val || val === '') return null;
                                const cleanVal = normalizeNumber(val);
                                const num = parseInt(cleanVal);
                                if (isNaN(num)) return 'Please enter a valid number';
                                if (num < 1000000) return 'Minimum total supply is 1,000,000';
                                if (num > 1000000000000) return 'Maximum total supply is 1,000,000,000,000';
                                return null;
                              };

                              const validationError = validateValue(field.state.value);

                              return (
                                <div>
                                  <CustomTextField
                                    name={field.name}
                                    type="text"
                                    placeholder="1,000,000,000"
                                    value={formatNumber(field.state.value)}
                                    onChange={(e) => {
                                      const normalized = normalizeNumber(e.target.value);
                                      if (normalized === '' || /^\d{1,13}$/.test(normalized)) {
                                        field.handleChange(normalized);
                                      }
                                    }}
                                    inputProps={{
                                      inputMode: 'numeric',
                                      pattern: '^[0-9,.\s]*$',
                                      maxLength: 16,
                                      autoComplete: 'off',
                                    }}
                                    theme="blue"
                                  />
                                  {validationError ? (
                                    <p className="text-xs text-red-400 mt-2">
                                      {validationError}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-slate-500 mt-2">
                                      Default: 1 Billion coins
                                    </p>
                                  )}
                                </div>
                              );
                            },
                          })}
                        </div>

                        {/* Creator Fee */}
                        <div className='flex flex-col justify-between'>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Creator Fee
                          </label>
                          {form.Field({
                            name: 'creatorFee',
                            children: (field) => (
                              <div className="flex gap-1 sm:gap-2 flex-wrap">
                                {[
                                  { value: '0', label: '0%' },
                                  { value: '1', label: '1%' },
                                  { value: '2', label: '2%' },
                                  { value: '3', label: '3%' },
                                  { value: '4', label: '4%' },
                                  { value: '5', label: '5%' }
                                ].map((option) => (
                                  <PillButton
                                    key={option.value}
                                    theme={field.state.value === option.value ? 'blue' : 'ghost'}
                                    size="sm"
                                    onClick={() => field.handleChange(option.value)}
                                    className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 ${field.state.value === option.value ? '' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                                  >
                                    {option.label}
                                  </PillButton>
                                ))}
                              </div>
                            ),
                          })}
                          <p className="text-xs text-slate-500 mt-2">
                            Default: 1%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Launch Settings */}
                    <div className={`${appThemes.cyan.background} border ${appThemes.cyan.border} rounded-xl transition-all duration-300 p-4 sm:p-6`}>
                      <div className={`flex items-center justify-between transition-all duration-300 ${isDevSettingsExpanded ? 'mb-4' : 'mb-0'}`}>
                        <h2 className={`text-lg font-semibold ${appThemes.cyan.text}`}>Dev Settings</h2>
                        <button
                          type="button"
                          onClick={() => setIsDevSettingsExpanded(!isDevSettingsExpanded)}
                          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                        >
                          <span>{isDevSettingsExpanded ? 'Collapse' : 'Apply dev settings'}</span>
                          <span className="text-lg font-bold transition-transform duration-200">
                            {isDevSettingsExpanded ? '−' : '+'}
                          </span>
                        </button>
                      </div>
                      
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300 overflow-hidden ${
                        isDevSettingsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        {/* First Buy */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            First Buy Amount (SOL)
                          </label>
                          {form.Field({
                            name: 'preBuy',
                            children: (field) => {
                              // Normalize decimal input to handle international formats
                              const normalizeDecimal = (input: string) => {
                                if (!input) return '';
                                // Replace comma decimal separator with dot for consistency
                                let normalized = input.replace(',', '.');
                                // Remove any thousand separators (spaces, dots that aren't decimal)
                                // Keep only one decimal point
                                const parts = normalized.split('.');
                                if (parts.length > 2) {
                                  // Multiple dots - keep first as decimal, remove others
                                  normalized = parts[0] + '.' + parts.slice(1).join('');
                                }
                                return normalized;
                              };

                              // Validate decimal input
                              const validateDecimal = (val: string) => {
                                if (!val || val === '') return null;
                                const normalized = normalizeDecimal(val);
                                if (!/^\d+(\.\d*)?$/.test(normalized) && !/^\.\d+$/.test(normalized)) {
                                  return 'Please enter a valid number';
                                }
                                const num = parseFloat(normalized);
                                if (isNaN(num)) return 'Please enter a valid number';
                                if (num < 0) return 'Amount cannot be negative';
                                if (num > 100) return 'Amount cannot exceed 100 SOL';
                                return null;
                              };

                              const validationError = validateDecimal(field.state.value);

                              return (
                                <div>
                                  <CustomTextField
                                    name={field.name}
                                    type="text"
                                    placeholder="0"
                                    value={field.state.value}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const normalized = normalizeDecimal(val);
                                      // Allow empty, valid decimal formats, or starting with decimal point
                                      if (val === '' || /^\d+([.,]\d*)?$/.test(val) || /^[.,]\d+$/.test(val)) {
                                        field.handleChange(normalized);
                                      }
                                    }}
                                    inputProps={{
                                      inputMode: 'decimal',
                                      pattern: '^\\d*[.,]?\\d*$',
                                      maxLength: 5,
                                      autoComplete: 'off',
                                    }}
                                  theme="cyan"
                                />
                                {validationError ? (
                                  <p className="text-xs text-red-400 mt-2">
                                    {validationError}
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-500 mt-2">
                                    Amount of SOL to buy on launch
                                  </p>
                                )}
                              </div>
                            );
                            },
                          })}
                        </div>

                        {/* Burn Percentage */}
                        <div className="relative group">
                          {form.Field({
                            name: 'preBuy',
                            children: (preBuyField) => {
                              return form.Field({
                                name: 'burnPercentage',
                                children: (burnField) => {
                                  const hasFirstBuy = preBuyField.state.value && parseFloat(preBuyField.state.value) > 0;
                                  return (
                                    <div key="burn-percentage-container" className={cn(
                                      'h-full flex flex-col justify-between',
                                      !hasFirstBuy && 'opacity-70'
                                    )}>
                                      <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Burn Percentage
                                      </label>
                                      <div className="flex gap-1 sm:gap-2 flex-wrap">
                                        {[0, 25, 50, 75, 100].map((percentage) => {
                                          const isSelected = burnField.state.value === percentage.toString();
                                          return (
                                            <PillButton
                                              key={percentage}
                                              theme={isSelected ? 'cyan' : 'ghost'}
                                              size="sm"
                                              onClick={() => burnField.handleChange(percentage.toString())}
                                              disabled={!hasFirstBuy}
                                              className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 ${isSelected ? '' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                                            >
                                              {percentage + "%"}
                                            </PillButton>
                                          );
                                        })}
                                      </div>
                                      <p className="text-xs text-slate-500 mt-2">
                                        {!hasFirstBuy ? "Percentage of first buy coins to burn" : "Amount of coins to burn: " + (parseFloat(preBuyField.state.value) * parseFloat(burnField.state.value) / 100) + " SOL"}
                                      </p>
                                      
                                      {!hasFirstBuy && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -inset-2 bg-[#0B0F13]/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                                          <div className="text-center p-4 max-w-xs pointer-events-auto">
                                            <p className="text-sm text-slate-300">
                                              Enter a <span className="font-bold text-cyan-400">First Buy Amount</span> to enable burn percentage selection.
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                },
                              });
                            },
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Social Links */}
                    <div className={`bg-slate-800/30 border border-slate-600/30 rounded-xl transition-all duration-300 p-4 sm:p-6`}>
                      <div className={`flex items-center justify-between transition-all duration-300 ${isSocialLinksExpanded ? 'mb-4' : 'mb-0'}`}>
                        <h2 className="text-lg font-semibold text-white">Social Links</h2>
                        <button
                          type="button"
                          onClick={() => setIsSocialLinksExpanded(!isSocialLinksExpanded)}
                          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                        >
                          <span>{isSocialLinksExpanded ? 'Collapse' : 'Add social info'}</span>
                          <span className="text-lg font-bold transition-transform duration-200">
                            {isSocialLinksExpanded ? '−' : '+'}
                          </span>
                        </button>
                      </div>
                      
                      <div className={`space-y-4 transition-all duration-300 overflow-hidden ${
                        isSocialLinksExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Website
                          </label>
                          {form.Field({
                            name: 'website',
                            children: (field) => (
                              <div className="flex items-center gap-3">
                                <CustomTextField
                                  name={field.name}
                                  type="url"
                                  placeholder="your-website.com"
                                  value={field.state.value}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  onClear={() => field.handleChange('')}
                                  inputProps={{ autoComplete: 'off' }}
                                />
                                <div 
                                  className={`p-2  rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                    field.state.value ? 'opacity-100 bg-black' : 'opacity-50 bg-transparent pointer-events-none'
                                  }`}
                                  onClick={() => {
                                    if (field.state.value) {
                                      let url = field.state.value;
                                      // Check if it's already a full URL
                                      if (url.startsWith('http://') || url.startsWith('https://')) {
                                        window.open(url, '_blank');
                                      } else {
                                        // Add https:// prefix for website
                                        const platformUrl = 'https://' + url;
                                        window.open(platformUrl, '_blank');
                                      }
                                    }
                                  }}
                                  title={field.state.value ? `Visit ${field.state.value}` : 'Enter a website URL first'}
                                >
                                  <span className="iconify ph--globe w-5 h-5" />
                                </div>
                              </div>
                            ),
                          })}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            X (Twitter)
                          </label>
                          {form.Field({
                            name: 'twitter',
                            children: (field) => (
                              <div className="flex items-center gap-3">
                                <CustomTextField
                                  name={field.name}
                                  type="url"
                                  placeholder="x.com/your-handle"
                                  value={field.state.value}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  onClear={() => field.handleChange('')}
                                  inputProps={{ autoComplete: 'off' }}
                                />
                                <div 
                                  className={`p-2 rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                    field.state.value ? 'opacity-100 bg-black' : 'opacity-50 bg-transparent pointer-events-none'
                                  }`}
                                  onClick={() => {
                                    if (field.state.value) {
                                      let url = field.state.value;
                                      // Check if it's already a full URL or contains domain
                                      if (url.startsWith('http://') || url.startsWith('https://') || url.includes('x.com/') || url.includes('twitter.com/')) {
                                        // If it's a partial URL without protocol, add https://
                                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                          url = 'https://' + url;
                                        }
                                        window.open(url, '_blank');
                                      } else {
                                        // Add platform URL prefix for just the handle
                                        const platformUrl = 'https://x.com/' + url.replace(/^@/, '');
                                        window.open(platformUrl, '_blank');
                                      }
                                    }
                                  }}
                                  title={field.state.value ? `Visit ${field.state.value}` : 'Enter a Twitter handle first'}
                                >
                                  <span className="iconify ph--twitter-logo w-5 h-5" />
                                                                  </div>
                              </div>
                            ),
                          })}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Telegram
                          </label>
                          {form.Field({
                            name: 'telegram',
                            children: (field) => (
                              <div className="flex items-center gap-3">
                                <CustomTextField
                                  name={field.name}
                                  type="url"
                                  placeholder="t.me/your-handle"
                                  value={field.state.value}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  onClear={() => field.handleChange('')}
                                  inputProps={{ autoComplete: 'off' }}
                                />
                                <div 
                                  className={`p-2 rounded-lg border border-slate-600/30 hover:border-white/50 hover:bg-white/[7%] transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                    field.state.value ? 'opacity-100 bg-black' : 'opacity-50 bg-transparent pointer-events-none'
                                  }`}
                                  onClick={() => {
                                    if (field.state.value) {
                                      let url = field.state.value;
                                      // Check if it's already a full URL or contains domain
                                      if (url.startsWith('http://') || url.startsWith('https://') || url.includes('t.me/')) {
                                        // If it's a partial URL without protocol, add https://
                                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                          url = 'https://' + url;
                                        }
                                        window.open(url, '_blank');
                                      } else {
                                        // Add platform URL prefix for just the handle
                                        const platformUrl = 'https://t.me/' + url.replace(/^@/, '');
                                        window.open(platformUrl, '_blank');
                                      }
                                    }
                                  }}
                                  title={field.state.value ? `Visit ${field.state.value}` : 'Enter a Telegram URL first'}
                                >
                                  <span className="iconify ph--telegram-logo w-5 h-5" />
                                                                  </div>
                              </div>
                            ),
                          })}
                        </div>
                      </div>
                    </div>

                    {/* SOL Balance Note */}
                    <div className="text-center">
                      <span className="text-[10px] sm:text-sm text-slate-600">
                        Recommended: At least ~0.05 SOL balance to launch a coin
                      </span>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center pb-2">
                      <SubmitButton 
                        isSubmitting={isLoading} 
                        isHovered={isHovered}
                        setIsHovered={setIsHovered}
                      />
                    </div>
                  </form>
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </Page>
  );
}

const SubmitButton = ({ isSubmitting, isHovered, setIsHovered }: { 
  isSubmitting: boolean;
  isHovered: boolean;
  setIsHovered: (value: boolean) => void;
}) => {
  const { authenticated } = usePrivy();
  const router = useRouter();

  if (!authenticated) {
    return (
      <PillButton
        type="button"
        theme="green"
        size="lg"
        onClick={() => router.push('/login')}
      >
        Log in to Launch
      </PillButton>
    );
  }

     return (
     <div className="relative">
       <motion.div
         onMouseEnter={() => setIsHovered(true)}
         onMouseLeave={() => setIsHovered(false)}
         animate={isHovered ? {
           scale: [1, 1.2, 1, 1.2, 1],
           transition: {
             duration: 2,
             repeat: Infinity,
             ease: "easeInOut"
           }
         } : {
           scale: 1,
           transition: {
             duration: 0.3,
             ease: "easeOut"
           }
         }}
         className="hidden md:block"
       >
                 <PillButton
           type="submit"
           theme="green"
           size="lg"
           disabled={isSubmitting}
         >
           {isSubmitting ? (
             <div className="flex items-center gap-2">
               <span className="iconify ph--spinner w-5 h-5 animate-spin" />
               <span>Launching...</span>
             </div>
           ) : (
             <span className="flex items-center gap-2">
               <span className="iconify ph--rocket w-5 h-5" />
               <span>Launch Coin</span>
             </span>
           )}
         </PillButton>
       </motion.div>
       
       {/* Mobile version without animation */}
       <div className="md:hidden">
         <PillButton
           type="submit"
           theme="green"
           size="lg"
           disabled={isSubmitting}
         >
           {isSubmitting ? (
             <div className="flex items-center gap-2">
               <span className="iconify ph--spinner w-5 h-5 animate-spin" />
               <span>Launching...</span>
             </div>
           ) : (
             <span className="flex items-center gap-2">
               <span className="iconify ph--rocket w-5 h-5" />
               <span>Launch Coin</span>
             </span>
           )}
         </PillButton>
       </div>
     </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Cache SSR response at the CDN for short period to reduce TTFB
  try {
    ctx.res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  } catch {}

  return {
    props: {
      // No props needed for this static page
    },
  };
};
