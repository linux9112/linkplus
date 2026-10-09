import { app } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './db/check-connection.js';

async function bootstrap() {
  console.log(`Starting LinkPulse server in [${env.NODE_ENV}] mode...`);

  // Verify MySQL connectivity at startup
  const dbStatus = await checkDatabaseConnection();
  if (!dbStatus.ok) {
    console.warn(`⚠️ Warning: Database connection check reported issues: ${dbStatus.error}`);
    console.warn(`Server will still listen, but database operations will require MySQL connectivity.`);
  } else {
    console.log('✅ MySQL database connection verified successfully.');
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 LinkPulse API server listening on http://localhost:${env.PORT}`);
    console.log(`🔗 Allowed Client URL: ${env.APP_URL}`);
  });

  const shutdown = () => {
    console.log('\nShutting down LinkPulse server gracefully...');
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Only invoke bootstrap directly if run as main entry point
if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('Fatal error during LinkPulse server startup:', err);
    process.exit(1);
  });
}

export default app;
