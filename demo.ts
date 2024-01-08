import { EosConsole } from './src/eos-console';

(async () => {
    const eos = new EosConsole({ host: 'localhost' });

    await eos.connect();
    await eos.changeUser(1);

    const macros = await eos.macros.getAll();
    console.log(macros);

    const groups = await eos.groups.getAll();
    console.log(groups);

    const cueLists = await eos.cueLists.getAll();
    console.log(cueLists);

    const cues = await eos.cues.getAll(1);
    console.log(cues);
})();
