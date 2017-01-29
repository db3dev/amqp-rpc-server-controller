# amqp-rpc-server-controller
A server controller for receiving RPC requests over AMQP and RabbitMQ.

This server makes use of RxJs Observables for connection events.

# Creating An Action Function
Your action function requires two parameters to be successful:

```
1) message
2) callback
```

Message is what is being sent to the server and callback should be called with a return message for the requester.

Responses are expected to be an Object and is then sent out as a buffer.

# Connecting To Server
```
// Call when RPC is received
function rpcAction(rpcMessage, callback) {
    // Arbitrary Action to take with Requester's Message
    console.log(rpcMessage);
    
    // Send Response To Requester
    callback({ resp: 'Success!' });
}

// Require Server Module
var Config = require('@db3dev/rabbitmq-rpc-server').Config,
    Server = require('@db3dev/rabbitmq-rpc-server').Server;

// Configure Server to Connect to RabbitMQ Server
var config = new Config({
    username: 'user',
    password: 'password',
    host: 'example.com',
    vhost: 'vhost',
    queueName: 'rpc_api'
});

// Instantiate Server
var server = new Server(config);

// Attempt to connect to server
server.connect(rpcAction); // returns a promise
    .then((rabbitmq_channel) => {
        ... // Post connection actions.
    })
    .catch((err) => {
        // Handle errors
        console.log(err)
    });
```
