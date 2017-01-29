import {RPC_Server} from './server';
import {Config} from './config';
import * as amqplib from 'amqplib';

describe('server', () => {
    let underTest: RPC_Server;

    const connection = jasmine.createSpyObj('Connection', ['createChannel']),
        channel = jasmine.createSpyObj('Channel', ['assetQueue', 'consume']);

    connection.createChannel.and.callFake((): Promise<amqplib.Channel> => {
        return new Promise<amqplib.Channel>((resolve) => {
            resolve(channel);
        });
    });
    channel.assetQueue.and.callFake((): any => undefined);

    const config: Config = new Config({
        username: 'testUser',
        password: 'testPassword',
        host: 'testhost.io',
        vhost: 'testVhost',
        queueName: 'testQueue'
    });

    beforeEach(() => {
        underTest = new RPC_Server(config);
    });

    afterEach(() => {
        underTest = null;
    });

    describe('connect() is initiated', () => {
        function mockActionFunc(message: any, cb: Function): any { return null; }
        channel.consume.and.callFake((): any => undefined);

        beforeEach(() => {
            spyOn(amqplib, 'connect').and.callFake((): Promise<amqplib.Connection> => {
                return new Promise<amqplib.Connection>((resolve) => {
                    resolve(connection);
                });
            });
        });

        afterEach(() => {
            connection.createChannel.calls.reset();
            channel.assetQueue.calls.reset();
            channel.consume.calls.reset();
        });

        it('throws an error if no actionFunction', () => {
            try {
                underTest.connect(null);
                expect(true).toBeFalsy();
            } catch (err) {
                expect(true).toBeTruthy();
            }
        });

        it('creates a listener to consume channel', () => {
            underTest.connect(mockActionFunc).then(() => {
                expect(channel.consume).toHaveBeenCalledTimes(1);
                expect(channel.consume).toHaveBeenCalledWith(
                    underTest.queueName,
                    jasmine.any(Function)
                );
            });
        });
    });

    describe('request is received', () => {
        function mockActionFunc(message: any, cb: Function): void { cb(message) }

        const mockMQ = {
            sendMsg (content: any) {
                channel.registered({
                    content: content,
                    properties: {
                        replyTo: 'test',
                        correlationId: 1
                    }
                });
            }
        },
            errRespNotAnObject: Buffer = new Buffer(JSON.stringify(new Error('Response must be a JSON object.')));

        channel.consume.and.callFake((queueName: string, listener: Function): any => {
            channel.registered = listener;
        });

        it('sends response back to channel as a buffer', () => {
            underTest.connect(mockActionFunc)
                .then((channel: amqplib.Channel) => {
                    const message = new Buffer(JSON.stringify({ test: 'this is a test' }));
                    mockMQ.sendMsg(message);

                    expect(channel.sendToQueue).toHaveBeenCalledWith(message);
                });
        });

        it('throws an error if response is a string', () => {
            function mockActionFuncErr(message: any, cb: Function): void { cb('nope') }

            underTest.connect(mockActionFuncErr)
                .then((channel: amqplib.Channel) => {
                    const message = new Buffer(JSON.stringify({ test: 'this is a test' }));
                    mockMQ.sendMsg(message);

                    expect(channel.sendToQueue).toHaveBeenCalledWith(
                        errRespNotAnObject
                    );
                });
        });

        it('throws an error if message is a function', () => {
            function mockActionFuncErr(message: any, cb: Function): void { cb((): any => undefined) }

            underTest.connect(mockActionFuncErr)
                .then((channel: amqplib.Channel) => {
                    const message = new Buffer(JSON.stringify({ test: 'this is a test' }));
                    mockMQ.sendMsg(message);

                    expect(channel.sendToQueue).toHaveBeenCalledWith(
                        errRespNotAnObject
                    );
                });
        });

        it('throws an error if method is a number', () => {
            function mockActionFuncErr(message: any, cb: Function): void { cb(1) }

            underTest.connect(mockActionFuncErr)
                .then((channel: amqplib.Channel) => {
                    const message = new Buffer(JSON.stringify({ test: 'this is a test' }));
                    mockMQ.sendMsg(message);

                    expect(channel.sendToQueue).toHaveBeenCalledWith(
                        errRespNotAnObject
                    );
                });
        });
    });
});