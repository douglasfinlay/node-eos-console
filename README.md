# node-eos-console

> Node.js library to interface with ETC Eos Family lighting consoles, written in TypeScript

## Design Goals

- Expose an intuitive API that hides OSC specifics as much as possible
- Publish all Eos events through an `EventEmitter` interface
- Cache record targets to increase performance

## Design Non-Goals

- This library is not designed to automatically synchronise with show data like
[EosSyncLib](https://github.com/ETCLabs/EosSyncLib)

## Basic Usage

### Console Discovery

```ts
const discovery = new Discovery();

discovery.on('found', (device: EtcDiscoveredDevice) => {
    console.log(`Found console: ${device.name}`);
});

discovery.start();
```

## License

`node-eos-console` is licensed under the MIT license. See
[`LICENSE`](https://github.com/douglasfinlay/node-eos-console/blob/main/LICENSE)
for details.

## Disclaimer

This project is in no way affiliated with [ETC](https://www.etcconnect.com/).
