import { EventEmitter } from 'eventemitter3';
import * as udp from 'node:dgram';
import * as os from 'node:os';
import * as osc from 'osc-min';
import { OscArgument, OscMessage } from './osc';

export interface EtcDiscoveredDevice {
    host: string;
    name: string;
    port: number;
    uid: string;
    version: string;
}

export interface EtcDiscoveryOptions {
    /**
     * @default 3000
     */
    expireTimeout?: number;

    /**
     * @default 1000
     */
    discoveryInterval?: number;

    /**
     * @default 'ETC Discovery (Node.js)'
     */
    serviceName?: string;
}

export class EtcDiscovery extends EventEmitter<EtcDiscoveryEvents> {
    private devicesLastSeen = new Map<string, number>();
    private discoveredDevices = new Map<string, EtcDiscoveredDevice>();
    private requestMessage: Uint8Array | null = null;
    private running = false;
    private socket: udp.Socket | null = null;
    private timer: NodeJS.Timeout | null = null;

    private readonly discoveryInterval;
    private readonly expireTimeout;
    private readonly serviceName;

    constructor(options: EtcDiscoveryOptions = {}) {
        super();

        this.discoveryInterval = options.discoveryInterval ?? 1000;
        this.expireTimeout = options.expireTimeout ?? 3000;
        this.serviceName = options.serviceName ?? 'ETC Discovery (Node.js)';
    }

    public start() {
        if (this.running) {
            return;
        }

        this.running = true;

        this.socket = udp.createSocket('udp4');

        this.socket.on('error', err => {
            this.emit('error', err);
            this.stop();
        });

        this.socket.on('message', this.handleReply.bind(this));

        this.socket.bind(
            {
                address: '0.0.0.0',
                port: 0,
            },
            () => {
                this.onSocketListening();
            },
        );
    }

    public stop() {
        if (!this.running) {
            return;
        }

        if (this.timer) {
            clearInterval(this.timer);
        }

        this.running = false;

        this.socket?.close();
        this.socket?.removeAllListeners();

        this.discoveredDevices.clear();
        this.devicesLastSeen.clear();
    }

    public getDevices() {
        return Array.from(this.discoveredDevices.values());
    }

    private onSocketListening() {
        if (!this.socket) {
            throw new Error('socket is not initialised');
        }

        this.socket.setBroadcast(true);

        this.requestMessage = osc.toBuffer({
            address: '/etc/discovery/request',
            args: [
                {
                    type: 'integer',
                    value: this.socket.address().port,
                },
                {
                    type: 'string',
                    value: this.serviceName,
                },
            ],
        });

        this.discover();
        this.timer = setInterval(() => {
            this.discover();
        }, this.discoveryInterval);
    }

    private handleReply(data: Uint8Array, info: udp.RemoteInfo) {
        const rawMsg = osc.fromBuffer(data);

        if (rawMsg.oscType !== 'message') {
            return;
        }

        const msg = new OscMessage(
            rawMsg.address,
            rawMsg.args.map(arg => new OscArgument(arg.value, arg.type)),
        );

        let uid = msg.args[2].getString();
        uid = uid.substring(1, uid.length - 1);

        const host = info.address;
        const port = msg.args[0].getInteger();
        const name = msg.args[1].getString();
        const version = msg.args[3].getString();

        // TODO: what are args[4] (bool) and args[5] (string)?

        const device: EtcDiscoveredDevice = {
            host: info.address,
            name,
            port,
            uid,
            version,
        };

        const uniqueHostKey = `${uid}_${host}_${port}`;
        const isNewDevice = !this.discoveredDevices.has(uniqueHostKey);

        this.discoveredDevices.set(uniqueHostKey, device);
        this.devicesLastSeen.set(uniqueHostKey, new Date().getTime());

        if (isNewDevice) {
            this.emit('found', device);
        }
    }

    private discover() {
        this.deleteExpiredDevices();

        if (!this.requestMessage) {
            throw new Error('requestMessage is not initialised');
        }

        if (!this.socket) {
            throw new Error('socket is not initialised');
        }

        const networkInterfaces = os.networkInterfaces(),
            broadcastAddresses: string[] = [];

        for (const addresses of Object.values(networkInterfaces)) {
            if (!addresses) {
                continue;
            }

            for (const address of addresses) {
                if (address.internal || address.family !== 'IPv4') {
                    continue;
                }

                const broadcastAddr = calculateBroadcastAddr(
                    address.address,
                    address.netmask,
                );

                broadcastAddresses.push(broadcastAddr);
            }
        }

        for (const address of broadcastAddresses) {
            this.socket.send(this.requestMessage, 3034, address, err => {
                if (err) {
                    this.emit('error', err);
                }
            });
        }
    }

    private deleteExpiredDevices() {
        const now = new Date().getTime();

        for (const [key, lastSeenTime] of this.devicesLastSeen.entries()) {
            if (now - lastSeenTime > this.expireTimeout) {
                const device = this.discoveredDevices.get(key);

                this.discoveredDevices.delete(key);
                this.devicesLastSeen.delete(key);

                if (device) {
                    this.emit('lost', device);
                }
            }
        }
    }
}

interface EtcDiscoveryEvents {
    error: (err: Error) => void;
    found: (device: EtcDiscoveredDevice) => void;
    lost: (device: EtcDiscoveredDevice) => void;
}

const calculateBroadcastAddr = (addr: string, netmask: string) => {
    const addrParts = addr.split('.').map(Number);
    const netmaskParts = netmask.split('.').map(Number);

    return addrParts.map((e, i) => (~netmaskParts[i] & 0xff) | e).join('.');
};
