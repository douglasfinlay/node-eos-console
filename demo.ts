import { EosConsole } from './src/eos-console';

(async () => {
    const eos = new EosConsole('localhost');

    await eos.connect();
    await eos.changeUser(1);

    const promises = [
        eos.getIntensityPalettes(),
        eos.getCurves(),
        eos.getMagicSheets(),
        eos.getPresets(),
        eos.getPixmaps(),
        eos.getBeamPalettes(),
        eos.getFocusPalettes(),
        eos.getSubs(),
        eos.getCueLists(),
        eos.getCues(1),
        eos.getCues(2),
        eos.getCues(3),
        eos.getSnapshots(),
        eos.getPatch(),
        eos.getMacros(),
        eos.getColorPalettes(),
    ];

    await Promise.all(promises);

    // const macros = await eos.getMacros();
    // console.log(macros);

    // const groups = await eos.getGroups();
    // console.log(groups);

    // const cueLists = await eos.getCueLists();
    // console.log(cueLists);

    // const cues = await eos.getCues(1);
    // console.log(cues);
})();
