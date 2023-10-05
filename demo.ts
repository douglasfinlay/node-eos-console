import { EosConsole } from './src/eos-console';

(async () => {
    const eos = new EosConsole('localhost');

    await eos.connect();
    await eos.changeUser(1);

    const macros = await eos.getMacros();
    console.log(macros);

    const groups = await eos.getGroups();
    console.log(groups);

    const cueLists = await eos.getCueLists();
    console.log(cueLists);

    const cues = await eos.getCues(1);
    console.log(cues);
})();
