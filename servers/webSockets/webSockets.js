/* NODE MODULES */
var eventerface = require('eventerface'),
    io = require('socket.io');

/** MODULE INTERFACE
 *@method {function} - 
 */
module.exports = {
    createServer: createServer
};

/*----------------------------------------------------------------------------*/

/** 
 * @param
 * @returns
 */
function createServer(zone, options, onReady) {
    // eventerface.find(zone.namespace, function (zoneNamespace) {
        var webSockets = io.listen(options.port, function () {
            console.log('WebSockets server running on port ' + options.port);
            onReady();
        });
        webSockets.set('log level', 1);
        webSockets.sockets.on('connection', function (socket) {
            socket.emit('welcome', { hello: 'world' });
            socket.on('/element/event/', function (event) {
                console.log(data);
            });
        });
    // });
}