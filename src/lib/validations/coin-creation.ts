import { Pool } from 'pg';
import { findUserByWalletId } from '@/lib/database';

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface CoinCreationData {
    tokenName: string;
    tokenSymbol: string;
    tokenDescription: string;
    tokenLogo: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    preBuy?: string;
    burnPercentage?: string;
    xUserHandle?: string;
    totalSupply?: string;
    creatorFee?: string;
    category?: string;
    walletId: string;
}

export class CoinCreationValidator {
    private errors: ValidationError[] = [];
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    // Add validation error
    private addError(field: string, message: string, code: string = 'VALIDATION_ERROR') {
        this.errors.push({ field, message, code });
    }

    // Check if validation passed
    public isValid(): boolean {
        return this.errors.length === 0;
    }

    // Get all validation errors
    public getErrors(): ValidationError[] {
        return this.errors;
    }

    // Validate required fields
    public validateRequiredFields(data: CoinCreationData): this {
        if (!data.tokenName || data.tokenName.trim().length === 0) {
            this.addError('tokenName', 'Token name is required', 'REQUIRED_FIELD');
        }

        if (!data.tokenSymbol || data.tokenSymbol.trim().length === 0) {
            this.addError('tokenSymbol', 'Token symbol is required', 'REQUIRED_FIELD');
        }


        if (!data.tokenLogo || data.tokenLogo.trim().length === 0) {
            this.addError('tokenLogo', 'Token logo is required', 'REQUIRED_FIELD');
        }

        if (!data.walletId || data.walletId.trim().length === 0) {
            this.addError('walletId', 'Wallet ID is required', 'REQUIRED_FIELD');
        }

        return this;
    }

    // Validate token name - now emoji-friendly!
    public validateTokenName(tokenName: string): this {
        if (!tokenName) return this;

        const trimmed = tokenName.trim();

        if (trimmed.length < 3) {
            this.addError('tokenName', 'Token name must be at least 3 characters', 'INVALID_LENGTH');
        }

        if (trimmed.length > 50) {
            this.addError('tokenName', 'Token name must be less than 50 characters', 'INVALID_LENGTH');
        }

        // Allow any characters including emojis - only validate length
        return this;
    }

    // Validate token symbol - now emoji-friendly!
    public validateTokenSymbol(tokenSymbol: string): this {
        if (!tokenSymbol) return this;

        const trimmed = tokenSymbol.trim();

        if (trimmed.length < 1) {
            this.addError('tokenSymbol', 'Token symbol is required', 'INVALID_LENGTH');
        }

        if (trimmed.length > 10) {
            this.addError('tokenSymbol', 'Token symbol must be less than 10 characters', 'INVALID_LENGTH');
        }

        // Allow any characters including emojis - only validate length
        return this;
    }

    // Validate token logo
    public validateTokenLogo(tokenLogo: string): this {
        if (!tokenLogo) return this;

        // Check if it's a valid base64 image
        if (!tokenLogo.startsWith('data:image/')) {
            this.addError('tokenLogo', 'Token logo must be a valid image file', 'INVALID_FORMAT');
            return this;
        }

        // Check file size (base64 is ~33% larger than binary)
        const base64Data = tokenLogo.split(',')[1];
        if (base64Data) {
            const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
            const sizeInMB = sizeInBytes / (1024 * 1024);

            if (sizeInMB > 2) {
                this.addError('tokenLogo', 'Token logo must be less than 2MB', 'FILE_TOO_LARGE');
            }
        }

        return this;
    }

    // Validate wallet authentication
    public async validateWallet(data: CoinCreationData): Promise<this> {
        if (!data.walletId) return this;

        try {
            const user = await findUserByWalletId(this.pool, data.walletId);

            if (!user) {
                this.addError('walletId', 'Invalid wallet ID - user not found', 'INVALID_WALLET');
                return this;
            }

            // Store user data for later use if needed
            (this as any).user = user;
        } catch (error) {
            this.addError('walletId', 'Failed to validate wallet', 'WALLET_VALIDATION_ERROR');
        }

        return this;
    }

    // Validate total supply
    public validateTotalSupply(totalSupply: string): this {
        if (!totalSupply) return this;

        // Normalize international number formats
        const cleanVal = totalSupply.replace(/[,.\s]/g, '').replace(/\D/g, '');
        const num = parseInt(cleanVal);

        if (isNaN(num)) {
            this.addError('totalSupply', 'Total supply must be a valid number', 'INVALID_NUMBER');
            return this;
        }

        if (num < 1000000) {
            this.addError('totalSupply', 'Total supply must be at least 1 million', 'INVALID_RANGE');
        }

        if (num > 1000000000000) {
            this.addError('totalSupply', 'Total supply must be at most 1 trillion', 'INVALID_RANGE');
        }

        return this;
    }

    // Validate creator fee
    public validateCreatorFee(creatorFee: string): this {
        if (!creatorFee) return this;

        const validFees = ['0', '1', '2', '3', '4', '5'];

        if (!validFees.includes(creatorFee)) {
            this.addError('creatorFee', 'Creator fee must be 0%, 1%, 2%, 3%, 4%, or 5%', 'INVALID_VALUE');
        }

        return this;
    }

    // Validate pre-buy amount (received in lamports from frontend)
    public validatePreBuy(preBuy: string): this {
        if (!preBuy) return this;

        // Normalize international decimal formats (comma to dot)
        const normalizedPreBuy = preBuy.replace(',', '.');
        const lamportAmount = parseFloat(normalizedPreBuy);

        if (isNaN(lamportAmount)) {
            this.addError('preBuy', 'Pre-buy amount must be a valid number', 'INVALID_NUMBER');
            return this;
        }

        if (lamportAmount < 0) {
            this.addError('preBuy', 'Pre-buy amount cannot be negative', 'INVALID_RANGE');
        }

        // Convert lamports to SOL for validation (1 SOL = 1e9 lamports)
        const solAmount = lamportAmount / 1e9;
        if (solAmount > 100) {
            this.addError('preBuy', 'Pre-buy amount cannot exceed 100 SOL', 'INVALID_RANGE');
        }

        return this;
    }

    // Validate burn percentage
    public validateBurnPercentage(burnPercentage: string, preBuy: string): this {
        if (!burnPercentage || !preBuy) return this;

        const validPercentages = ['0', '25', '50', '75', '100'];

        if (!validPercentages.includes(burnPercentage)) {
            this.addError('burnPercentage', 'Burn percentage must be 0%, 25%, 50%, 75%, or 100%', 'INVALID_VALUE');
            return this;
        }

        // Normalize international decimal formats for preBuy
        const normalizedPreBuy = preBuy.replace(',', '.');
        const preBuyNum = parseFloat(normalizedPreBuy);
        if (preBuyNum > 0 && burnPercentage === '0') {
            // This is fine - user can choose not to burn
        }

        return this;
    }

    // Validate X user handle (fee sharing)
    public validateXUserHandle(xUserHandle: string, category: string, user?: any): this {
        // If no X user handle is provided, that's fine for any category
        if (!xUserHandle || xUserHandle.trim() === '') return this;

        // Category validation - only Tech and Fundraiser can use fee sharing
        if (category !== 'Tech' && category !== 'Fundraiser') {
            this.addError('xUserHandle', 'Fee sharing is only available for Tech and Fundraiser categories. Please remove the X username or change your category to Tech or Fundraiser.', 'CATEGORY_RESTRICTION');
            return this; // Don't validate further if category is wrong
        }

        const trimmed = xUserHandle.trim();

        // Length validation
        if (trimmed.length < 4) {
            this.addError('xUserHandle', 'X username must be at least 4 characters', 'INVALID_LENGTH');
        }

        if (trimmed.length > 15) {
            this.addError('xUserHandle', 'X username must be at most 15 characters', 'INVALID_LENGTH');
        }

        // Format validation - only alphanumeric and underscore
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
            this.addError('xUserHandle', 'X username can only contain letters, numbers, and underscores', 'INVALID_FORMAT');
        }

        // Self-tagging prevention
        if (user && user.twitterUsername && trimmed.toLowerCase() === user.twitterUsername.toLowerCase()) {
            this.addError('xUserHandle', 'You cannot tag yourself to share fees', 'SELF_TAGGING');
        }

        return this;
    }

    // Validate social media links
    public validateSocialLinks(website?: string, twitter?: string, telegram?: string): this {
        // Website validation
        if (website && website.trim() !== '') {
            let websiteUrl = website.trim();

            if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
                websiteUrl = 'https://' + websiteUrl;
            }

            try {
                new URL(websiteUrl);
            } catch {
                this.addError('website', 'Please enter a valid website URL', 'INVALID_URL');
            }
        }

        // Twitter validation
        if (twitter && twitter.trim() !== '') {
            let twitterUrl = twitter.trim();

            if (!twitterUrl.startsWith('http://') && !twitterUrl.startsWith('https://')) {
                twitterUrl = 'https://' + twitterUrl;
            }

            try {
                const url = new URL(twitterUrl);
                if (!url.hostname.includes('x.com') && !url.hostname.includes('twitter.com')) {
                    this.addError('twitter', 'X URL must start with x.com or twitter.com', 'INVALID_PLATFORM');
                }
            } catch {
                this.addError('twitter', 'Please enter a valid X URL', 'INVALID_URL');
            }
        }

        // Telegram validation
        if (telegram && telegram.trim() !== '') {
            let telegramUrl = telegram.trim();

            if (!telegramUrl.startsWith('http://') && !telegramUrl.startsWith('https://')) {
                telegramUrl = 'https://' + telegramUrl;
            }

            try {
                const url = new URL(telegramUrl);
                if (!url.hostname.includes('t.me')) {
                    this.addError('telegram', 'Telegram URL must start with t.me', 'INVALID_PLATFORM');
                }
            } catch {
                this.addError('telegram', 'Please enter a valid Telegram URL', 'INVALID_URL');
            }
        }

        return this;
    }

    // Validate total request body size
    public validateRequestBodySize(data: CoinCreationData): this {
        try {
            // Create a mock request body similar to what's sent to the API
            const mockRequestBody = {
                tokenLogo: data.tokenLogo,
                tokenName: data.tokenName,
                tokenSymbol: data.tokenSymbol,
                tokenDescription: data.tokenDescription,
                website: data.website,
                twitter: data.twitter,
                telegram: data.telegram,
                preBuy: data.preBuy || '0',
                burnPercentage: data.burnPercentage || '0',
                walletId: data.walletId,
                xUserHandle: data.xUserHandle,
                totalSupply: data.totalSupply || '1000000000',
                creatorFee: data.creatorFee || '1',
                category: data.category
            };

            const jsonString = JSON.stringify(mockRequestBody);
            const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
            const sizeInMB = sizeInBytes / (1024 * 1024);

            // Leave some buffer for Vercel's 3MB limit
            if (sizeInMB > 2.8) {
                this.addError('tokenLogo', 'Token logo is too large. Please reduce the image size.', 'REQUEST_TOO_LARGE');
            }
        } catch (error) {
            // If we can't calculate size, don't fail validation
            console.warn('Could not calculate request body size:', error);
        }

        return this;
    }

    // Main validation method
    public async validate(data: CoinCreationData): Promise<this> {
        this.errors = []; // Reset errors

        // First run synchronous validations
        this
            .validateRequiredFields(data)
            .validateTokenName(data.tokenName)
            .validateTokenSymbol(data.tokenSymbol)
            .validateTokenLogo(data.tokenLogo)
            .validateTotalSupply(data.totalSupply || '1000000000')
            .validateCreatorFee(data.creatorFee || '1')
            .validatePreBuy(data.preBuy || '0')
            .validateBurnPercentage(data.burnPercentage || '0', data.preBuy || '0')
            .validateSocialLinks(data.website, data.twitter, data.telegram)
            .validateRequestBodySize(data);

        // Then run async validations
        await this.validateWallet(data);
        
        // Finally run validations that depend on user data
        this.validateXUserHandle(data.xUserHandle || '', data.category || '', (this as any).user);

        return this;
    }
}
