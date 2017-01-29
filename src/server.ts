import {Channel, Connection, Message, connect} from 'amqplib';
import {Config} from './config';
import * as Bluebird from 'bluebird';

export class RPC_Server {
    private _uri: string;
    private _queueName: string;
    private _connection: Connection;
    private _channel: Channel;
    private _verboseOn: boolean;

    constructor(config: Config, verboseOn: boolean = false) {
        this._uri = config.uri;
        this._queueName = config.queueName;
        this._verboseOn = verboseOn;
    }

    public connect(
        actionFunction: (message: any, responseCallback: Function) => void
    ): Bluebird.Thenable<Channel> {
        if (!actionFunction) {
            throw new Error('Cannot start RPC_Server without an actionFunction');
        }

        const self: RPC_Server = this;

        return connect(this.uri)
            .then((connection: Connection) => {
                self._connection = connection;
                return connection.createChannel();
            })
            .then((channel: Channel) => {
                self._channel = channel;

                // Assert Queue
                channel.assertQueue(
                    self.queueName,
                    { durable: false }
                );
                channel.prefetch(1);
                if (self.verboseOn) {
                    console.log(`Awaiting RPC Requests On: ${self.queueName}`);
                }

                // Consume Messages
                self.consumeChannel.apply(self, [channel, actionFunction]);

                return self._channel;
            });
    }

    private consumeChannel(
        channel: Channel,
        actionFunction: (message: any, responseCallback: Function) => {}
    ): void {
        channel.consume(
            this.queueName,
            (msg: Message) => {
                const decodedMessage = msg.content.toString();

                // Handle Received Message
                if (this.verboseOn) {
                    console.log(`RECEIVED FROM BROKER: ${decodedMessage}`);
                }
                actionFunction(JSON.parse(decodedMessage), (response: any, error?: Error) => {
                    if (!response && !error) {
                        error = new Error('Could not complete request.');
                    }

                    if (typeof response !== 'object') {
                        error = new Error('Response must be a JSON object.');
                    }

                    if (error) {
                        // Failed to handle message
                        channel.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(error)),
                            { correlationId: msg.properties.correlationId }
                        );
                    } else {
                        // Send back response
                        const outgoing: string = JSON.stringify(response);

                        if (this.verboseOn) {
                            console.log(`SENDING TO BROKER: ${outgoing}`);
                        }
                        channel.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(outgoing),
                            { correlationId: msg.properties.correlationId }
                        );
                    }

                    // Send Ack
                    channel.ack(msg);
                });
            }
        );
    }

    public get connection(): Connection {
        return this._connection;
    }

    public get channel(): Channel {
        return this._channel;
    }

    public get uri(): string {
        return this._uri;
    }

    public get queueName(): string {
        return this._queueName;
    }

    public get verboseOn(): boolean {
        return this._verboseOn;
    }

    public set verboseOn(verboseOn: boolean) {
        this._verboseOn = verboseOn;
    }
}