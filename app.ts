import express from 'express';
import { createApp } from './server/src/app.js';

const app: ReturnType<typeof express> = createApp();

export default app;
