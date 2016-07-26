'use strict';
const Rx = require('rx');
const EventEmitter = require('events');

/**
 *  Connection Dependencies
 */
const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

module.exports = class RPC_Client {
    /**
     * Takes a config object and creates objects that a connection and channel will be stored in
     */
    constructor(configuration){
        this.uri = configuration.getUri();
        this.connection = null;
        this.channel = null;
    }

    setUri(configuration) {
        this.uri = configuration.getUri();
    }

    connect(config, actionFunction, verboseOn) {
        if(this.uri === 0) {
            return Rx.Observable.throw(new Error('Uri must be defined in order to start connection'));
        }

        if (!config) {
            return Rx.Observable.throw(new Error('No configuration was provided and is required. \n .connect(configuration, actionFunction)'))
        }
        
        if (!actionFunction) {
            return Rx.Observable.throw(new Error('No action was provided and is required. \n .connect(configuration, actionFunction)'))
        }
        
        const _self = this;

        // Create Connection
        const connPromise = require('amqplib').connect(this.uri)
        
        // Create Channel
        .then((connection) => {
            _self.connection = connection;
            return _self.connection.createChannel();
        })
        
        // Join RPC Queue, Set Consumer
        .then((channel) => {
            _self.channel = channel;

            // Assert Queue
            _self.channel.assertQueue(config.queueName, {durable: false});
            _self.channel.prefetch(1);
            if (verboseOn) {
                console.log('Awaiting RPC Requests On: ', config.queueName);
            }

            // Consume on queue
            _self.channel.consume(config.queueName, (msg)=>{
                if (verboseOn) {
                    console.log("RECEIVED FROM BROKER: ", msg.content.toString());
                }                
                
                if (msg !== null) {
                    // Handle incoming msg
                    actionFunction(JSON.parse(msg.content.toString()).msg, (response)=>{
                        // Send Response Back
                        if (response){
                            
                            const outgoing = {msg: response};
                            if (verboseOn){
                                console.log("SENDING TO BROKER: ", JSON.stringify(outgoing));
                            }                            
                            _self.channel.sendToQueue(
                                msg.properties.replyTo,
                                new Buffer(JSON.stringify(outgoing)), 
                                {correlationId: msg.properties.correlationId}
                            );
                        }
                        else {
                            _self.channel.sendToQueue(
                                msg.properties.replyTo,
                                new Buffer('The request was not successful'), 
                                {correlationId: msg.properties.correlationId}
                            );
                        }
                        
                        // Send Ack
                        _self.channel.ack(msg);
                    });
                }

                return _self.channel;
            });
        })

        return Rx.Observable.fromPromise(connPromise);
    }

    getConnection() {
        return this.connection;
    }

    getChannel() {
        return this.channel;
    }
}