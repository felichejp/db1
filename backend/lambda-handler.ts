// Lambda handler for AWS Lambda
// This file wraps the Express app for Lambda deployment
import serverless from 'serverless-http';
import app from './server';

// Create serverless handler
// Note: Socket.IO will not work in Lambda, only HTTP/API routes
export const handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/zip']
});

