import { buildApp } from "./app";

const port = Number(process.env.PORT || 8088);

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    app.log.info('SIGINT received: closing');
    await app.close();
    process.exit(0);
  });
}

main();
