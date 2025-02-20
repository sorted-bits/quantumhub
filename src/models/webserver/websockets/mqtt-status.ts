import expressWs from 'express-ws';
import { Logger } from 'quantumhub-sdk';
import { WebSocket } from 'ws';
import { Hub } from '../../hub';
import { ApiSocketConnection } from '../api-socket-connection';
import { Webserver } from '../webserver';

export class MqttStatusWebsocket implements ApiSocketConnection {
    private logger: Logger;
    private sockets: WebSocket[] = [];
    private lastData: any;

    server: Webserver;
    hub: Hub;

    constructor(hub: Hub, server: Webserver) {
        this.server = server;
        this.hub = hub;
        this.logger = this.hub.createLogger('MqttStatusWebsocket');
    }

    initialize = async (ws: expressWs.Instance): Promise<void> => {
        this.logger.trace('Initializing');

        ws.app.ws('/api/mqtt/status', (ws) => {
            this.sockets.push(ws);

            this.sendLastData(ws);

            ws.on('close', () => {
                this.sockets = this.sockets.filter((socket) => socket !== ws);
                this.logger.trace('Websocket disconnected');
            });
        });
    };

    send = async (data: any): Promise<void> => {
        this.lastData = data;
        this.sockets.forEach((socket) => socket.send(JSON.stringify(data)));
    };

    sendLastData = (socket: WebSocket): void => {
        if (this.lastData) {
            socket.send(JSON.stringify(this.lastData));
        }
    };
}