# hmpo-logger
Consistent logging for hmpo apps

## Usage

Top level logging configuration:
```javascript
var hmpoLogger = require('hmpo-logger');
hmpoLogger.config();

var app = require('express')();
app.use(hmpoLogger.middleware());
```

Logging messages:
```javascript
var logger = require('hmpo-logger').get();

logger.log('error', 'This is an error', err);
logger.warn('This is a warning');
logger.warn('This is an %s warning', 'interpolated');
logger.info('This is just info with :meta', {meta: 'metavalue'});
logger.info(':method :url took :responseTime ms and was res[content-length] bytes', {req, res});

logger.log('info', 'response :responseText', { responseText: logger.trimHtml(htmlBody, 100)});
```

*Note: Try to include `req` in your log metadata where possible to decorate your log entries with info about the current express request*

### `get(name)`

Get a named logger. The name places in the `label` log property and is prepended to the console log entry messages.

```javascript
require('hmpo-logger').get(name);
```

If name is ommited it is guessed from the nearest package.json file found in the calling package.
```javascript
require('hmpo-logger').get();
```

If name begins with a colon it is appended to the guessed name.
```javascript
require('hmpo-logger').get(':subname');
```
Returns a `winston` logger.

### `logger.trimHtml(text, maxLength)`

Trim tags out of an HTML string to help with more concise HTML error response logging. Defaults to a `maxLength` of 400.

Returns a string, or passes through `text` if not a string.


### `config(options)`

Initialise the logger at the top level of the app, specifying the log locations and logging levels of three pre-defined transports: console, app, and error.

*Note: configure the logger as early as possible in code before the logger gets used to avoid config issues.*

```javascript
var hmpoLogger = require('hmpo-logger');
hmpoLogger.config({ // defaults:
    // shortcuts to auto-configure console and logfile transports
    console: true,
    consoleLevel: 'debug',
    connsoleJSON: false, // logstash json or pretty print output
    consoleColor: true,

    app: undefined, // can be app log filename
    appLevel: 'info',

    error: undefined, // can be error log filename
    errorLevel: 'error',
    dateRotate: false,
    maxFiles: 5,

    // explicitly configured transports:
    transports: [],

    // metadata to add to all log lines
    meta: {
        host: 'host',
        pm: 'env.pm_id',
        sessionID: 'sessionID',
        method: 'method',
        request: 'request'
    },

    // metadata to add to `request` level logs
    requestMeta: {
        clientip: 'clientip',
        uniqueID: 'req.x-uniq-id',
        remoteAddress: 'connection.remoteAddress',
        hostname: 'hostname',
        port: 'port',
        response: 'statusCode',
        responseTime: 'responseTime',
        httpversion: 'version',
        bytes: 'res.content-length'
    },

    // catch unhandled exceptions and log them to the transports
    handleExceptions: true,

    // fine grain control for how requests are logged by the middleware method
    format: ':clientip :sessionID :method :request HTTP/:httpVersion :statusCode :res[content-length] - :responseTime ms',
    logPublicRequests: false,
    publicPattern: '/public/',
    logHealthcheckRequests: false,
    healthcheckPattern: '^/healthcheck(/|$)'
});
```

Returns `hmpoLogger`.

### `middleware()`

Log incomming requests from an `express` app.

```javascript
var hmpoLogger = require('hmpo-logger');

var app = require('express')();
app.use(hmpoLogger.middleware());
```

Returns express compatible middleware

## Rotating Logfiles

The config supports rotation based on the date using the `File` transport.

```
  dateRotate: true,
  maxFiles: 5, // keep 5 rotated files
```
The names of the log files will include the year, month, and day and will be based on the log filename, eg:
```
/path/name.log
/path/name-2016-10-02.log
/path/name-2016-10-01.log
/path/name-2016-09-31.log
```

### Additional transport options
In addition to the config shortcuts for console, app and error logs, app options can be specified in option objects:
```
  consoleOptions: { // Console transport options
    formatterOptions: { color: true }
  },
  appOptions: { // File transport options
    eol: '\t\n',
  },
  errorOptions: { // File transport options
    level: 'fatal
  }
```

If the app and error loggers have the same filename they will be merged into a single `File` transport.

Alternatively transports can be specified programatically:

```
transports: [
    {
        name: 'My transport', // used in debugging logs
        level: 'info', // log at this level and above

        className: 'FileTransport',
        // or specify a filename:
        filename: 'file.log',
        // or it will defaults to ConsoleTransport

        // logstash formatter
        formatter: 'logstash',
        formatterOptions: {
            maxLength: 500,
            maxObjects: 10,
            circular: '[circular]',
            indent: 4
        },

        // pretty print formatter
        formatter: 'pretty',
        formatterOptions: {
            color: true
            // other `util.inspect` options
        },

        // raw json formatter
        formatter: 'json',
        formatterOptions: {
            indent: 2
        },

        // other Console options:
        eol: '\n\r',

        // other File options:
        fileMode: 0o666,
        dateRotate: true,
        maxFiles: 3,
        eol: '\n'
    }
]
```

new transports can be added using `hmpoLogger.addTransportClass(Class, name)` and new formatters can be added with `hmpoLogger.addFormatter(formatterFnFactory, name)`
