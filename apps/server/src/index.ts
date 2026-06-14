import {loadConfig} from './config';
import {buildApp} from './app';

const config = loadConfig();
const app = await buildApp(config);
await app.listen({host: config.host, port: config.port});
app.log.info(`Playlist2Video server listening on http://${config.host}:${config.port}`);
