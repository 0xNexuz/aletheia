import './src/browser-polyfills.js';
import { deployCompact, discoverCompactWallets, retryCompact } from './src/midnight-client.js';
import { createRecovery, importRecovery, readRecovery, unlockRecovery, withDeploymentLock } from './src/deployment-recovery.js';
import { lookupDeployment } from './src/deployment-status.js';

const byId = (id) => document.getElementById(id);
const walletSelect = byId('wallet');
const deployButton = byId('deploy');
const status = byId('status');
const evidence = byId('evidence');
let recovery;
let busy = false;

function render() {
  let record;
  try { record = readRecovery(window.localStorage); }
  catch { status.textContent = 'Browser recovery storage is unavailable or invalid. Keep your downloaded recovery file; do not clear storage to retry.'; }
  byId('prepare-recovery').textContent = record ? 'Unlock saved recovery' : 'Create encrypted admin recovery';
  byId('download-recovery').disabled = busy || !recovery;
  byId('prepare-recovery').disabled = busy;
  byId('import-recovery').disabled = busy;
  byId('refresh-wallets').disabled = busy;
  byId('check-submission').disabled = busy || !record?.pendingTransactionId;
  byId('retry-panel').hidden = !record?.started || !!record?.contractAddress || record?.completed === true;
  byId('retry-approved').disabled = busy;
  byId('retry-deployment').disabled = busy || !recovery || !byId('backup-confirmed').checked || !byId('retry-approved').checked || !walletSelect.value;
  walletSelect.disabled = busy || !walletSelect.value;
  byId('contract-address').disabled = busy;
  byId('backup-confirmed').disabled = busy || !recovery;
  deployButton.disabled = busy || !recovery || !byId('backup-confirmed').checked || !walletSelect.value;
  deployButton.textContent = record?.started || byId('contract-address').value.trim() ? 'Connect 1AM & resume setup' : 'Connect 1AM & deploy safely';
  if (record) {
    if (!byId('contract-address').value) byId('contract-address').value = record.contractAddress || '';
    evidence.textContent = JSON.stringify({ network: record.network, contractAddress: record.contractAddress, pendingTransactionId: record.pendingTransactionId, submissionStatus: record.submissionStatus || (record.started ? 'legacy-result-not-recorded' : 'not-started'), lastSubmissionError: record.lastSubmissionError, previousAttempts: record.previousAttempts, configured: record.completed === true, transactions: record.transactions }, null, 2);
    evidence.hidden = false;
  }
}

function refreshWallets() {
  if (busy) return;
  const selected = walletSelect.value;
  const wallets = discoverCompactWallets();
  walletSelect.replaceChildren();
  for (const wallet of wallets) walletSelect.append(new window.Option(`${wallet.name} · API ${wallet.apiVersion}`, wallet.id));
  if (wallets.some((wallet) => wallet.id === selected)) walletSelect.value = selected;
  if (!wallets.length) walletSelect.append(new window.Option('No compatible wallet detected — use your 1AM Chrome profile', ''));
  // Focus changes from wallet approvals must never overwrite progress or unlock buttons.
  render();
}

async function run(action, lock = true) {
  if (busy) return;
  busy = true; render();
  try { await (lock ? withDeploymentLock(navigator.locks, action) : action()); }
  catch (error) { status.textContent = error?.message || 'Setup paused. Unlock the saved recovery to resume.'; }
  finally { busy = false; render(); }
}

byId('prepare-recovery').addEventListener('click', () => run(async () => {
  const password = byId('recovery-password').value;
  try {
    const record = readRecovery(window.localStorage);
    if (record) recovery = { record, secret: await unlockRecovery(record, password) };
    else {
      if (password !== byId('recovery-confirm').value) throw new Error('The recovery passphrases do not match.');
      recovery = await createRecovery(window.localStorage, password);
    }
    byId('backup-confirmed').checked = false;
    status.textContent = 'Recovery unlocked. Download the encrypted backup and keep its passphrase separately before continuing.';
  } finally { byId('recovery-password').value = ''; byId('recovery-confirm').value = ''; }
}));

byId('import-recovery').addEventListener('change', (event) => run(async () => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 32000) throw new Error('Recovery file is too large.');
    recovery = await importRecovery(window.localStorage, await file.text(), byId('recovery-password').value);
    byId('backup-confirmed').checked = false;
    status.textContent = 'Encrypted recovery imported. Save a current backup, then resume with the contract address.';
  } finally { byId('recovery-password').value = ''; byId('recovery-confirm').value = ''; event.target.value = ''; }
}));

byId('download-recovery').addEventListener('click', () => {
  try {
    const record = readRecovery(window.localStorage);
    if (!record || !recovery) return;
    const url = URL.createObjectURL(new window.Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'aletheia-preprod.admin-recovery.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Save the encrypted file and your passphrase separately. This protects the application-admin key, not your 1AM wallet seed.';
  } catch { status.textContent = 'Could not download recovery. Do not deploy until you have saved a backup.'; }
});

byId('refresh-wallets').addEventListener('click', refreshWallets);
byId('check-submission').addEventListener('click', () => run(async () => {
  const record = readRecovery(window.localStorage);
  status.textContent = 'Checking the official Preprod indexer. This does not submit a transaction.';
  const result = await lookupDeployment(record?.pendingTransactionId);
  if (result.status === 'confirmed') {
    byId('contract-address').value = result.contractAddress;
    status.textContent = `Deployment confirmed in block ${result.blockHeight}. Unlock your recovery and resume setup; do not deploy again.`;
  } else if (result.status === 'unconfirmed') {
    status.textContent = 'The saved ID is not confirmed on Preprod. This does not prove it was never submitted. Keep your recovery; no new deployment was sent.';
  } else {
    status.textContent = `Transaction found with result ${result.result || 'unknown'}; inspect its result before doing anything else. No new deployment was sent.`;
  }
}));
byId('backup-confirmed').addEventListener('change', render);
byId('retry-approved').addEventListener('change', render);
byId('contract-address').addEventListener('input', render);
walletSelect.addEventListener('change', render);
window.addEventListener('focus', refreshWallets);
deployButton.addEventListener('click', () => run(async () => {
  const result = await deployCompact(walletSelect.value, (message) => { status.textContent = message; }, {
    ...recovery, contractAddress: byId('contract-address').value, backupConfirmed: byId('backup-confirmed').checked
  });
  status.textContent = `${result.walletName}: deployment and all four setup steps verified on Preprod. A real claim still remains.`;
}, false));
byId('retry-deployment').addEventListener('click', () => run(async () => {
  const result = await retryCompact(walletSelect.value, (message) => { status.textContent = message; }, {
    ...recovery, backupConfirmed: byId('backup-confirmed').checked, retryApproved: byId('retry-approved').checked
  });
  status.textContent = `${result.walletName}: deployment and setup verified on Preprod. Save an updated recovery backup. A real claim still remains.`;
}, false));
render();
setTimeout(refreshWallets, 250);
