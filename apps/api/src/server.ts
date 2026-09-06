import app from './app';
import { env } from './utils/env';

app.listen({ port: env.PORT, host: '127.0.0.1' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  app.log.info(`Server listening at ${address} in ${env.NODE_ENV} mode`);
});