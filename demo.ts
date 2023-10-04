import { EosConsole } from './src/eos-console';

(async () => {
    const eos = new EosConsole('localhost');

    await eos.connect();
    await eos.changeUser(1);

    const cueCount = await eos.getCueCount(1);
    const promises = [];

    for (let i = 0; i < cueCount; i++) {
        promises.push(eos.getCue(1, i));
    }

    await Promise.all(promises);
})();
