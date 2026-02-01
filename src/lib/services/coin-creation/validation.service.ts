import { Pool } from 'pg';
import { CoinCreationValidator } from '@/lib/validations/coin-creation';
import { CoinCreationRequest, ExternalWalletCoinCreationRequest, ValidationResult } from './types';

export class ValidationService {
  constructor(private pool: Pool) {}

  async validateRequest(data: CoinCreationRequest): Promise<ValidationResult> {
    const validator = new CoinCreationValidator(this.pool);
    
    // Prepare data for validation
    const validationData = {
      tokenName: data.tokenName,
      tokenSymbol: data.tokenSymbol,
      tokenDescription: data.tokenDescription,
      tokenLogo: data.tokenLogo,
      website: data.website,
      telegram: data.telegram,
      preBuy: data.preBuy || '0',
      burnPercentage: data.burnPercentage || '0',
      xUserHandle: data.xUserHandle,
      totalSupply: data.totalSupply || '1000000000',
      creatorFee: data.creatorFee || '1',
      category: data.category || '',
      walletId: data.walletId
    };

    // Run all validations
    await validator.validate(validationData);
    
    if (!validator.isValid()) {
      return {
        isValid: false,
        errors: validator.getErrors()
      };
    }

    return {
      isValid: true,
      errors: [],
      data: validationData as CoinCreationRequest
    };
  }

  async validateExternalWalletRequest(data: ExternalWalletCoinCreationRequest): Promise<ValidationResult> {
    const validator = new CoinCreationValidator(this.pool);
    
    // Prepare data for validation (similar to regular validation but with external wallet address)
    const validationData = {
      tokenName: data.tokenName,
      tokenSymbol: data.tokenSymbol,
      tokenDescription: data.tokenDescription,
      tokenLogo: data.tokenLogo,
      website: data.website,
      telegram: data.telegram,
      preBuy: data.preBuy || '0',
      burnPercentage: data.burnPercentage || '0',
      xUserHandle: data.xUserHandle,
      totalSupply: data.totalSupply || '1000000000',
      creatorFee: data.creatorFee || '1',
      category: data.category || '',
      walletId: data.userWalletAddress // Use external wallet address as walletId for validation
    };

    // Run all validations
    await validator.validate(validationData);
    
    if (!validator.isValid()) {
      return {
        isValid: false,
        errors: validator.getErrors()
      };
    }

    return {
      isValid: true,
      errors: [],
      data: validationData as CoinCreationRequest
    };
  }
}
