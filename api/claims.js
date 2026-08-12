import { forwardAlethia } from './_bridge.js';
export default function handler(req, res) { return forwardAlethia(req, res, '/api/claims', ['GET', 'POST']); }