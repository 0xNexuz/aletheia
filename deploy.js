import './src/browser-polyfills.js';
import { deployCompact, discoverCompactWallets } from './src/midnight-client.js';

const walletSelect = document.querySelector('#wallet');
const refreshButton = document.querySelector('#refresh-wallets');
const deployButton = document.querySelector('#deploy');
const status = document.querySelector('#status');
const evidence = document.querySelector('#evidence');

function refreshWallets() {
  const wallets = discoverCompactWallets();
  walletSelect.replaceChildren();
  if (wallets.length === 0) {
    walletSelect.append(new Option('No compatible wallet detected', ''));
    walletSelect.disabled = true;
    deployButton.disabled = true;
    status.textContent = '1AM was not detected. Confirm this is Chrome, 1AM is enabled for localhost, and the wallet network is Preprod.';
    return [];
  }
  for (const wallet of wallets) walletSelect.append(new Option(`${wallet.name} · API ${wallet.apiVersion}`, wallet.id));
  walletSelect.disabled = false;
  deployButton.disabled = false;
  status.textContent = `${wallets.length === 1 ? wallets[0].name : `${wallets.length} wallets`} detected and ready.`;
  return wallets;
}

refreshButton.addEventListener('click', refreshWallets);
window.addEventListener('focus', refreshWallets);
setTimeout(refreshWallets, 250);

deployButton.addEventListener('click', async () => {
  deployButton.disabled = true;
  evidence.hidden = true;
  try {
    if (refreshWallets().length === 0) return;
    const result = await deployCompact(walletSelect.value, (message) => { status.textContent = message; });
    status.textContent = `${result.walletName} deployed Aletheia successfully on Preprod.`;
    evidence.textContent = JSON.stringify(result, null, 2);
    evidence.hidden = false;
  } catch (error) {
    status.textContent = error?.message || 'Preprod deployment failed.';
  } finally {
    deployButton.disabled = false;
  }
});
