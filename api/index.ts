// This file is the Vercel serverless entry point.
// It imports the Express app from the backend and exports it as a handler.
// Vercel detects the default export and wraps it automatically.

import app from '../backend/src/server';

export default app;
