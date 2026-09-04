import { forwardAlethia } from './_bridge.js';

export function configuredHealth(health) {
  const address = (process.env.ALETHEIA_CONTRACT_ADDRESS || '').trim();
  const configured = /^[a-f0-9]{64}$/i.test(address);
  return {
    ...health,
    midnightCompact: configured,
    midnightNetwork: 'preprod',
    contractAddress: configured ? address.toLowerCase() : null,
    midnightStatus: configured ? 'configured' : 'not-configured',
    // Configuration discovery is not a live chain or prover health check.
    midnightChainVerified: false,
  };
}

export default function handler(req, res) {
  return forwardAlethia(req, res, '/api/health', ['GET'], configuredHealth);
}
