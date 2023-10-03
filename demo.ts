import { EosConsole } from './src/eos-console';

(async () => {
    const eos = new EosConsole('localhost');

    await eos.connect();
})();
