import { forwardAlethia } from './_bridge.js';

export function configuredHealth(health) {
  const address = (process.env.ALETHEIA_CONTRACT_ADDRESS || '').trim();
  const backendCompatible = health?.apiVersion === 4 && health?.mode === 'compact-ready-private-allocation';
  const configured = backendCompatible && /^[a-f0-9]{64}$/i.test(address) && health?.contractAddress?.toLowerCase() === address.toLowerCase();
  return {
    ...health,
    midnightCompact: configured,
    midnightNetwork: 'preprod',
    contractAddress: configured ? address.toLowerCase() : null,
    midnightStatus: configured ? 'configured' : backendCompatible ? 'not-configured' : 'backend-incompatible',
    // Configuration discovery is not a live chain or prover health check.
    midnightChainVerified: false,
  };
}

export default function handler(req, res) {
  return forwardAlethia(req, res, '/api/health', ['GET'], configuredHealth);
}
