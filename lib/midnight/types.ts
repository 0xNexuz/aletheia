export type MidnightEnvironment = 'local' | 'preprod';

export type WalletReadinessCode =
  | 'WALLET_NOT_SYNCED'
  | 'NO_NIGHT'
  | 'NIGHT_NOT_REGISTERED_FOR_DUST'
  | 'DUST_ACCRUING'
  | 'DUST_NOT_SPENDABLE'
  | 'DUST_READY';

export interface DeploymentEvidence {
  environment: MidnightEnvironment;
  networkId: string;
  contractAddress: string;
  deploymentTxId: string;
  blockReference?: string;
  timestamp: string;
  artifactDigest: string;
}

export interface ClaimEvidence {
  environment: MidnightEnvironment;
  networkId: string;
  contractAddress: string;
  transactionId: string;
  blockReference?: string;
  timestamp: string;
  artifactDigest: string;
  program: string;
  nullifier: string;
  result: 'confirmed' | 'rejected';
  rejectionCode?: string;
}
