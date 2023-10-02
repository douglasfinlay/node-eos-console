import * as udp from 'node:dgram';
import { EventEmitter } from 'node:events';
import * as os from 'node:os';

import * as osc from 'osc-min';

export type EtcDiscoveredDevice = {
    host: string;
    name: string;
    port: number;
    uid: string;
    version: string;
};

export type EtcDiscoveryOptions = {
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
};

export class EtcDiscovery extends EventEmitter {
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
            () => this.onSocketListening(),
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
        this.timer = setInterval(() => this.discover(), this.discoveryInterval);
    }

    private handleReply(data: Uint8Array, info: udp.RemoteInfo) {
        const msg = osc.fromBuffer(data);

        if (msg.oscType !== 'message') {
            return;
        }

        let uid = msg.args[2].value;
        uid = uid.substring(1, uid.length - 1);

        const host = info.address;
        const port = msg.args[0].value;
        const name = msg.args[1].value;
        const version = msg.args[3].value;

        // TODO: what are args[4] (bool) and args[5] (string)?

        const device = {
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

        const ifaces = os.networkInterfaces(),
            broadcastAddrs: string[] = [];

        for (const addrs of Object.values(ifaces)) {
            if (!addrs) {
                continue;
            }

            for (const iface of addrs) {
                if (iface.internal || iface.family !== 'IPv4') {
                    continue;
                }

                const broadcastAddr = calculateBroadcastAddr(
                    iface.address,
                    iface.netmask,
                );

                broadcastAddrs.push(broadcastAddr);
            }
        }

        for (const addr of broadcastAddrs) {
            this.socket.send(this.requestMessage, 3034, addr, err => {
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

const calculateBroadcastAddr = (addr: string, netmask: string) => {
    const addrParts = addr.split('.').map(Number);
    const netmaskParts = netmask.split('.').map(Number);

    return addrParts.map((e, i) => (~netmaskParts[i] & 0xff) | e).join('.');
};
