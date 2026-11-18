process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto-de-pruebas';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/elyunque_test';
process.env.LOGIN_RATE_MAX = '1000'; // el límite de login se prueba aparte, en rateLimit.test.js
process.env.API_RATE_MAX = '100000';
