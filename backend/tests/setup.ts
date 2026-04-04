import dotenv from 'dotenv';
dotenv.config();

// Variables de entorno para tests
process.env.JWT_SECRET  = process.env.JWT_SECRET  || 'test-secret-key-for-jest-2024';
process.env.NODE_ENV    = 'test';
process.env.LOG_LEVEL   = 'silent'; // Pino no emite nada en tests

// Silenciar console residual que pudiera quedar
global.console.log  = jest.fn();
global.console.info = jest.fn();
