const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.textContent = open ? 'Close' : 'Menu';
});

nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = 'Menu';
}));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((item) => revealObserver.observe(item));

const quotes = [...document.querySelectorAll('.quote-card')];
const dots = [...document.querySelectorAll('.quote-dots button')];
let quoteIndex = 0;

function showQuote(index) {
  quoteIndex = (index + quotes.length) % quotes.length;
  quotes.forEach((quote, i) => quote.classList.toggle('active', i === quoteIndex));
  dots.forEach((dot, i) => dot.classList.toggle('active', i === quoteIndex));
}

document.querySelector('.quote-nav.prev').addEventListener('click', () => showQuote(quoteIndex - 1));
document.querySelector('.quote-nav.next').addEventListener('click', () => showQuote(quoteIndex + 1));
dots.forEach((dot, index) => dot.addEventListener('click', () => showQuote(index)));

const proofSteps = [...document.querySelectorAll('.form-step')];
const proofResult = document.querySelector('.proof-result');
let proofAnswers = [];

function showProofStep(index) {
  proofSteps.forEach((step, i) => step.classList.toggle('active', i === index));
}

document.querySelectorAll('.choice-grid button').forEach((button) => {
  button.addEventListener('click', () => {
    proofAnswers.push(button.dataset.value);
    const currentStep = Number(button.closest('.form-step').dataset.step);
    showProofStep(currentStep);
  });
});

document.querySelector('.generate-proof').addEventListener('click', () => {
  proofSteps.forEach((step) => step.classList.remove('active'));
  proofResult.classList.add('active');
});

document.querySelector('.restart-proof').addEventListener('click', () => {
  proofAnswers = [];
  proofResult.classList.remove('active');
  showProofStep(0);
});

const modal = document.querySelector('#story-modal');
const openModalButton = document.querySelector('.film-preview');
const closeModalButton = document.querySelector('.modal-close');

function openModal() {
  modal.hidden = false;
  document.body.classList.add('modal-open');
  closeModalButton.focus();
}

function closeModal() {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  openModalButton.focus();
}

openModalButton.addEventListener('click', openModal);
closeModalButton.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
modal.querySelector('.pill').addEventListener('click', closeModal);

document.querySelector('#contact-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const status = event.currentTarget.querySelector('.form-status');
  status.textContent = 'Received. An Alethia guide will map your minimum disclosure.';
  event.currentTarget.reset();
});
