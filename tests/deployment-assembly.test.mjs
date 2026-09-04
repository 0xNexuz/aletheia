import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { ecMulGenerator } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { ContractDeploy } from '@midnight-ntwrk/ledger-v8';
import { createUnprovenDeployTx } from '@midnight-ntwrk/midnight-js-contracts';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { Aletheia, witnesses } from 'aletheia-compact-contract';
import { deploymentArguments, verifyDeploymentSetup } from '../src/deployment-setup.js';

test('SDK assembles one preconfigured deployment using real verifier assets, without proving or broadcasting', async () => {
  setNetworkId('preprod');
  const assets = fileURLToPath(new URL('../contract/src/managed/aletheia/', import.meta.url));
  const compiledContract = CompiledContract.make('Aletheia', Aletheia.Contract).pipe(CompiledContract.withWitnesses(witnesses), CompiledContract.withCompiledFileAssets(assets));
  const issuer = { providerId: '1', publicKey: ecMulGenerator(123n) };
  const programBytes = async id => new Uint8Array(createHash('sha256').update(id).digest());
  // Synthetic test state only. Keep the private constructor result out of logs/files.
  const result = await createUnprovenDeployTx({ zkConfigProvider: new NodeZkConfigProvider(assets), walletProvider: {
    getCoinPublicKey: () => '01'.repeat(32), getEncryptionPublicKey: () => '02'.repeat(32)
  } }, { compiledContract, initialPrivateState: { userSecret: new Uint8Array(32).fill(7) }, args: await deploymentArguments(issuer, programBytes) });
  await verifyDeploymentSetup({ issuer, programBytes, readLedger: async () => Aletheia.ledger(result.public.initialContractState.data) });
  const actions = [...result.private.unprovenTx.intents.values()].flatMap(intent => intent.actions).filter(action => action instanceof ContractDeploy);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].address, result.public.contractAddress);
});
