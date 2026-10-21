import express from 'express';
import app from './server/dist/vercel.js';

if (typeof express !== 'function' || typeof app !== 'function') {
  throw new Error('PesoWise failed to load on Vercel.');
}

export default app;
