<h1 align="center"><code>eos-console</code></h1>
  <p align="center">Node.js library to interface with ETC Eos Family lighting
  consoles, written in TypeScript</p>
</div>

> **Warning**  
> This project is under active development and is not feature complete

## Design Goals

- Expose a simple and intuitive API
- Hide underlying OSC specifics as much as possible
- Publish all Eos events through an `EventEmitter` instance
- Cache responses where possible to improve performance of repeated requests

## Design Non-Goals

This library is not designed to automatically synchronise with show data like
[EosSyncLib](https://github.com/ETCLabs/EosSyncLib).

## Basic Usage

Below are some very brief examples of this library's features.

### Console Discovery

```ts
import { EtcDiscovery } from 'eos-console';

const discovery = new EtcDiscovery();

discovery.on('found', (device: EtcDiscoveredDevice) => {
    console.log(`Found console: ${device.name}`);
});

discovery.start();
```

### Connection

```ts
import { EosConsole } from 'eos-console';

const eos = new EosConsole('localhost');
await eos.connect();
// ...
await eos.disconnect();
```

### Retrieving Show Data

```ts
const swVersion = eos.getVersion();
const groups = await eos.getGroups();
const cue = await eos.getCue(1, 0.5);
```

### Executing Commands

```ts
await eos.changeUser(5);
await eos.fireCue(3, 1.4);
await eos.executeCommand('Chan 1 Frame Thrust A 50 Frame Angle A -30');
await eos.executeCommand('Cue 2 Label %1 Enter', ['Command with substitutions']);
```

### Handling Console Events

#### Implicit Output

```ts
eos.on('user-cmd', (userId, cmd) => 
    console.log(`User ${userId}: ${cmd}`)
});

eos.on('current-cue', (cueList, cueNumber) => { /* ... */ });
```

#### Explicit OSC Output

```ts
eos.on('osc', ({address, args}) => { /* ... */ });
```

## To Do

- [ ] Documentation
- [ ] Settle on an event naming convention for implicit output

## License

`eos-console` is licensed under the MIT license. See
[`LICENSE`](https://github.com/douglasfinlay/node-eos-console/blob/main/LICENSE)
for details.

## Disclaimer

This project is in no way affiliated with [ETC](https://www.etcconnect.com/).
