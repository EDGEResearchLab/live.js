var path = require('path'),
    winston = require('winston');

var log = new winston.Logger({
    transports: [
        new winston.transports.Console({
            colorize: true,
            timestamp: true,
            level: 'debug'
        }),
        new winston.transports.File({
            filename: path.join(path.dirname(require.main.filename), 'logs', 'server.log'),
            level: 'debug',
            maxsize: 1024*2*5 // 5mb
        })
    ]
});

module.exports = log;
