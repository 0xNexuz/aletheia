const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
menuButton?.addEventListener('click', () => { const open = nav.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(open)); menuButton.textContent = open ? 'Close' : 'Menu'; });
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { nav.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.textContent = 'Menu'; }));

const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); } }), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((item) => revealObserver.observe(item));

const quotes = [...document.querySelectorAll('.quote-card')];
const dots = [...document.querySelectorAll('.quote-dots button')];
let quoteIndex = 0;
function showQuote(index) { quoteIndex = (index + quotes.length) % quotes.length; quotes.forEach((quote, i) => quote.classList.toggle('active', i === quoteIndex)); dots.forEach((dot, i) => dot.classList.toggle('active', i === quoteIndex)); }
document.querySelector('.quote-nav.prev')?.addEventListener('click', () => showQuote(quoteIndex - 1));
document.querySelector('.quote-nav.next')?.addEventListener('click', () => showQuote(quoteIndex + 1));
dots.forEach((dot, index) => dot.addEventListener('click', () => showQuote(index)));

const modal = document.querySelector('#story-modal');
const openModalButton = document.querySelector('.film-preview');
const closeModalButton = document.querySelector('.modal-close');
function openModal() { modal.hidden = false; document.body.classList.add('modal-open'); closeModalButton.focus(); }
function closeModal() { modal.hidden = true; document.body.classList.remove('modal-open'); openModalButton.focus(); }
openModalButton?.addEventListener('click', openModal); closeModalButton?.addEventListener('click', closeModal);
modal?.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal && !modal.hidden) closeModal(); });
modal?.querySelector('.pill')?.addEventListener('click', closeModal);

const encoder = new TextEncoder();
const PROGRAM_ID = 'emergency-relief-2026';
const proofSteps = [...document.querySelectorAll('.form-step')];
const progress = [...document.querySelectorAll('.claim-progress i')];
const acceptedResult = document.querySelector('.proof-result:not(.proof-denied)');
const deniedResult = document.querySelector('.proof-denied');
const claimStatus = document.querySelector('#claim-status');
const walletStatus = document.querySelector('#wallet-status');
const generateButton = document.querySelector('.generate-proof');
let claim = { walletKind: null, walletMaterial: null, answers: {}, receipt: null };

function bytesToHex(bytes) { return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function bytesToBase64(bytes) { let value = ''; new Uint8Array(bytes).forEach((b) => { value += String.fromCharCode(b); }); return btoa(value); }
async function sha256(value) { return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
function showProofStep(index) { proofSteps.forEach((step, i) => step.classList.toggle('active', i === index)); progress.forEach((bar, i) => bar.classList.toggle('active', i <= index)); acceptedResult.classList.remove('active'); deniedResult.classList.remove('active'); }
function setNetwork(live, label, detail) { document.querySelector('#network-dot').classList.toggle('live', live); document.querySelector('#network-label').textContent = label; document.querySelector('#network-detail').textContent = detail; }

async function connectTestWallet() {
  let secret = localStorage.getItem('aletheia_test_wallet_v1');
  if (!secret) { const random = crypto.getRandomValues(new Uint8Array(32)); secret = bytesToBase64(random); localStorage.setItem('aletheia_test_wallet_v1', secret); }
  claim.walletKind = 'aletheia-test'; claim.walletMaterial = secret;
  const id = await sha256(secret);
  walletStatus.textContent = `Test wallet ready · ${id.slice(0, 8)}…${id.slice(-6)}`;
  setNetwork(false, 'Alethia test mode', 'Local wallet + signed Alethia claim ledger');
  setTimeout(() => showProofStep(1), 350);
}

async function connectMidnightWallet() {
  const wallet = window.midnight?.mnLace;
  if (!wallet?.connect) { walletStatus.textContent = 'Midnight Lace was not detected. Install/enable it, refresh, or use the test wallet.'; return; }
  try {
    walletStatus.textContent = 'Waiting for Midnight wallet approval…';
    const connectedApi = await wallet.connect('preprod');
    const addresses = await connectedApi.getShieldedAddresses();
    const connection = await connectedApi.getConnectionStatus();
    if (!connection || !addresses?.shieldedAddress) throw new Error('Wallet did not return a shielded address.');
    claim.walletKind = 'midnight-preprod'; claim.walletMaterial = addresses.shieldedAddress;
    walletStatus.textContent = `Midnight connected · ${addresses.shieldedAddress.slice(0, 8)}…${addresses.shieldedAddress.slice(-6)}`;
    setNetwork(true, 'Midnight Preprod wallet', 'Wallet connected · claims recorded in Alethia signed ledger');
    setTimeout(() => showProofStep(1), 350);
  } catch (error) { walletStatus.textContent = error?.message || 'Midnight wallet connection was declined.'; }
}

document.querySelectorAll('.wallet-choice').forEach((button) => button.addEventListener('click', () => button.dataset.wallet === 'midnight' ? connectMidnightWallet() : connectTestWallet()));

document.querySelectorAll('.choice-grid button').forEach((button) => button.addEventListener('click', () => {
  const currentStep = Number(button.closest('.form-step').dataset.step);
  if (currentStep === 2) claim.answers.emergency = button.dataset.value === 'yes';
  if (currentStep === 3) claim.answers.receiving = button.dataset.value === 'yes';
  showProofStep(currentStep);
}));

async function createClaim() {
  const eligible = claim.answers.emergency === true && claim.answers.receiving === false;
  if (!eligible) { proofSteps.forEach((step) => step.classList.remove('active')); deniedResult.classList.add('active'); return; }
  generateButton.disabled = true; claimStatus.textContent = 'Creating commitment and checking uniqueness…';
  try {
    const walletId = await sha256(`aletheia-wallet-v1:${claim.walletMaterial}`);
    const nullifier = await sha256(`aletheia-nullifier-v1:${PROGRAM_ID}:${claim.walletMaterial}`);
    const commitment = await sha256(JSON.stringify({ domain: 'aletheia-claim-v1', programId: PROGRAM_ID, emergency: true, receiving: false, walletId }));
    const response = await fetch('/api/claims', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ programId: PROGRAM_ID, walletId, nullifier, commitment, walletKind: claim.walletKind }) });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || 'Claim could not be recorded.'), { code: data.code });
    claim.receipt = data;
    proofSteps.forEach((step) => step.classList.remove('active')); progress.forEach((bar) => bar.classList.add('active'));
    document.querySelector('#receipt-short').textContent = `${data.receipt.id.slice(0, 8)}…`;
    acceptedResult.classList.add('active');
  } catch (error) {
    claimStatus.textContent = error.code === 'DUPLICATE_CLAIM' ? 'This wallet has already claimed this program benefit. No second receipt was issued.' : error.message;
  } finally { generateButton.disabled = false; }
}
generateButton?.addEventListener('click', createClaim);

async function verifyReceipt() {
  const status = document.querySelector('#verification-status');
  if (!claim.receipt) return;
  status.textContent = 'Checking signature and ledger record…';
  try {
    const canonical = JSON.stringify(claim.receipt.receipt);
    const publicKey = await crypto.subtle.importKey('jwk', claim.receipt.publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const signature = Uint8Array.from(atob(claim.receipt.signature), (c) => c.charCodeAt(0));
    const localValid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signature, encoder.encode(canonical));
    const response = await fetch(`/api/claims?id=${encodeURIComponent(claim.receipt.receipt.id)}`);
    const ledger = await response.json();
    status.textContent = localValid && response.ok && ledger.valid ? 'Verified: signature valid and receipt is present in the claim ledger.' : 'Verification failed.';
  } catch { status.textContent = 'Verification failed: receipt data is incomplete or altered.'; }
}
document.querySelector('.verify-receipt')?.addEventListener('click', verifyReceipt);
document.querySelector('.copy-receipt')?.addEventListener('click', async () => { if (!claim.receipt) return; await navigator.clipboard.writeText(JSON.stringify(claim.receipt, null, 2)); document.querySelector('#verification-status').textContent = 'Receipt copied.'; });

document.querySelectorAll('.restart-proof').forEach((button) => button.addEventListener('click', () => { claim.answers = {}; claim.receipt = null; claimStatus.textContent = ''; document.querySelector('#verification-status').textContent = ''; showProofStep(claim.walletMaterial ? 1 : 0); }));

document.querySelector('#contact-form')?.addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const status = form.querySelector('.form-status'); const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true; status.textContent = 'Sending…';
  try { const payload = Object.fromEntries(new FormData(form)); const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Message could not be sent.'); status.textContent = 'Received. Your reference is ' + data.reference + '.'; form.reset(); } catch (error) { status.textContent = error.message; } finally { submit.disabled = false; }
});