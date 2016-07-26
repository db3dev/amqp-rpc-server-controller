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

Responses will be turned into an Object and have the response assigned to Object.msg which is then sent out as a buffer.

# Connecting Without Subscriptions
```
// Call when RPC is received
function rpcAction(rpcMessage, callback) {
    // Arbitrary Action to take with Requester's Message
    console.log(rpcMessage);
    
    // Send Response To Requester
    cb('Received');
}

// Require Server Module
var RPC = require('rpc-server');

// Configure Server to Connect to RabbitMQ Server

var config = RPC.Config({
    username: 'user',
    password: 'password',
    host: 'example.com',
    vhost: 'vhost',
    queueName: 'rpc_api'
});

// Start Server
var server = RPC.server(config);

// Attempt to connect to server
server.connect();
```

# Connecting With a Subscription
```
// Call when RPC is received
function rpcAction(rpcMessage, callback) {
    // Arbitrary Action to take with Requester's Message
    console.log(rpcMessage);
    
    // Send Response To Requester
    cb('Received');
}

// Require server Module
var RPC = require('rpc-server');

// Configure server to Connect to RabbitMQ Server
var config = RPC.Config({
    username: 'user',
    password: 'password',
    host: 'example.com',
    vhost: 'vhost',
    queueName: 'rpc_api'
});

// Start server
var server = RPC.server(config, rpcAction);

// Attempt to connect to server
server.connect().subscribe(
    (channel) => { ... }, // Actions after connection is made
    (err) => { ... } // Handle Error
)
```
