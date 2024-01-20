<h1 align="center"><code>eos-console</code></h1>
    <p align="center">Node.js library to interface with ETC Eos Family lighting
    consoles, written in TypeScript
    <br />
    <br />
    <a href="https://github.com/douglasfinlay/node-eos-console/issues/new?template=bug-report.md">Report Bug</a>
    ·
    <a href="https://github.com/douglasfinlay/node-eos-console/issues/new?template=feature-request.md">Request Feature</a>
    </p>
</div>

> **Warning**
> This project is under active development and compatibility with any specific
> Eos console versions is not guaranteed.

For a summary of the most recent changes, please see
[CHANGELOG.md](https://github.com/douglasfinlay/node-eos-console/blob/main/CHANGELOG.md).

## Design Goals

- Expose a simple and intuitive API to read and modify show data.
- Hide underlying OSC specifics as much as possible.
- Parse and emit all Eos events.
- Cache responses to improve performance of repeated requests.

Note that this library is not designed to automatically synchronise with show
data like [EosSyncLib](https://github.com/ETCLabs/EosSyncLib).

## Basic Usage

Below are some very brief examples of this library's features.

### Console Discovery

```ts
import { EtcDiscovery } from 'eos-console';

const discovery = new EtcDiscovery();

discovery.on('found', (device: EtcDiscoveredDevice) => {
    console.log(`Found console: ${device.name}`);
});

discovery.on('lost', (device: EtcDiscoveredDevice) => {
    console.log(`Lost console: ${device.name}`);
});

discovery.start();
```

### Connection

```ts
import { EosConsole } from 'eos-console';

const eos = new EosConsole({ host: 'localhost', port: 3037 });

await eos.connect();
// ...
await eos.disconnect();
```

### Configuration

#### Changing User ID

```ts
// Set the user ID to 0 to operate as the background user
await eos.changeUser(1);
```

#### Creating OSC Banks

OSC banks are created using the `cueListBanks`, `directSelectsBanks`, and
`faderBanks` modules.

```ts
// Create cue list bank 1 showing the next 10 and previous 3 cues of cue list 1
await eos.cueListBanks.create(1, {
    cueList: 1,
    pendingCueCount: 10,
    prevCueCount: 3
});

// Create direct selects banks 1 showing 10 colour palettes
await eos.directSelectsBanks.create(1, {
    buttonCount: 10,
    targetType: 'cp'
});

// Create fader bank 1 showing 10 faders on its second page
await eos.faderBanks.create(1, {
    faderCount: 10,
    page: 2
});
```

### Retrieving Show Data

Show data is accessed through dedicated modules. The following record target
modules are available:

- `beamPalettes`
- `colorPalettes`
- `cueLists`
- `cues`
- `curves`
- `effects`
- `focusPalettes`
- `groups`
- `intensityPalettes`
- `macros`
- `magicSheets`
- `patch`
- `pixelMaps`
- `presets`
- `snapshots`
- `subs`

```ts
const cue = await eos.cues.get(1, 0.5);
await eos.cues.fire(3, 1.4);

const channels = await eos.patch.getAll();
const groups = await eos.groups.getAll();
```

### Executing Commands

```ts
await eos.executeCommand('Chan 1 Frame Thrust A 50 Frame Angle A -30');
await eos.executeCommand('Cue 2 Label %1 Enter', ['Command with substitutions']);
```

### Handling Console Events

#### Implicit Output

```ts
eos.on('user-cmd', ({ commandLine, userId }) =>
    console.log(`User ${userId}: ${commandLine}`)
});

eos.on('active-cue', ({ cue }) => {
    console.log(`Active cue: ${cue.cueList}/${cue.cueNumber}`);
});
```

#### Explicit OSC Output

```ts
eos.on('osc', ({ address, args }) => { /* ... */ });
```

### Logging

By default the library will not write any log output. To enable logging, provide
a log handler via the constructor.

```ts
const eos = new EosConsole({
    logging: (level, message) => console.log(`[${level}] ${message}`),
});
```

## License

`eos-console` is licensed under the MIT license. See
[`LICENSE`](https://github.com/douglasfinlay/node-eos-console/blob/main/LICENSE)
for details.

## Disclaimer

This project is in no way affiliated with [ETC](https://www.etcconnect.com/).
