# hmpo-logger
The `hmpo-logger` library provides consistent and configurable logging for HMPO applications, integrating seamlessly 
with Express to capture and manage log messages across various levels.

## Installation
Install `hmpo-logger` using npm:
```javascript
npm install hmpo-logger
```

## Usage
The recommended approach for setting up logging is to use [`hmpo-app`](https://github.com/HMPO/hmpo-app), as `hmpo-logger` is already included and configured as part of its utilities.  
If you are using `hmpo-form-wizard` within an `hmpo-app` project, logging is automatically handled by `hmpo-app` and requires no additional configuration.

### hmpo-app Setup (Preferred Method)
hmpo-app provides a comprehensive setup for applications, streamlining the configurations process. It includes built-in features such as **logging**, error handling, and session management, making it easier to get started. Additionally, hmpo-app handles the setup and configuration for hmpo-form-wizard, which in turn incorporates `hmpo-logger` to provide structured logging for form-based applications.

#### Example Setup with hmpo-app
```javascript
const { setup } = require('hmpo-app');
const express = require('express');
const logger = require('hmpo-logger').get();

const { app, staticRouter, router } = setup({ config: { APP_ROOT: __dirname } });

// Override template file extension from .html to .njk
app.set('view engine', 'njk');

// Log application startup
logger.info('Starting HMPO application...');

// Mock API to submit data to
staticRouter.use(express.json());
staticRouter.post('/api/submit', (req, res) => {
    logger.info(`Mock submit API received data: ${JSON.stringify(req.body, null, 2)}`);
    setTimeout(() => {
        const reference = Math.round(100000 + Math.random() * 100000);
        logger.info(`Generated reference: ${reference}`);
        res.json({ reference });
    }, 1000);
});

router.use('/eligibility', require('./routes/eligibility'));
router.use('/apply', require('./routes/apply'));
router.get('/', (req, res) => res.redirect('/eligibility'));

app.use(staticRouter);
app.use(router);
app.use((err, req, res, next) => {
    logger.error('An error occurred:', err);
    res.status(500).send('Something went wrong!');
});
```

#### Further Usage
For more examples of how to use `hmpo-logger` within `hmpo-app`, see the [example app](https://github.com/HMPO/hmpo-app/blob/master/example/app.js) it comes included and configured as part of its utilities. 

### Middleware setup
If you still want to use `hmpo-logger` as a standalone in your Express application, configure the middleware like below.  
Make sure to configure logging at the top level of your application, initialize hmpo-logger as early as possible. This ensures all logging behavior is set up before the logger is used elsewhere in your application.

```javascript
const express = require('express');
const hmpoLogger = require('hmpo-logger');

const app = express();

// Configure the logger at the top level of your application
hmpoLogger.config();

// Attach the logging middleware to log incoming requests
app.use(hmpoLogger.middleware());

// Example route
app.get('/', (req, res) => {
    res.send('Logging middleware is active!');
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

### Custom Configuration Example
You can customize the configuration by passing options to `hmpoLogger.config()`:

```javascript
hmpoLogger.config({
    console: true,
    consoleLevel: 'debug',
    consoleJSON: false,
    consoleColor: true,
    
    app: 'application.log',
    appLevel: 'info',
    
    error: 'errors.log',
    errorLevel: 'error',
    dateRotate: true,
    maxFiles: 10,

    handleExceptions: true,

    format: ':clientip :method :request :statusCode - :responseTime ms',
});
```

### Logging messages:
With hmpo-logger, you can log messages at different levels and formats:

```javascript
const logger = require('hmpo-logger').get();

logger.log('error', 'This is an error message', new Error('Something went wrong'));
logger.warn('This is a warning');
logger.warn('This is an %s warning', 'interpolated');
logger.info('This is just info with :meta', { meta: 'metavalue' });
logger.info(':method :url took :responseTime ms and was res[content-length] bytes', { req, res });

logger.log('info', 'response :responseText', { responseText: logger.trimHtml('<html>Some response</html>', 100) });
```

*Note: Try to include `req` in your log metadata where possible to decorate your log entries with info about the current express request*

### Debugging and Troubleshooting

To display a debug log, use:
```javascript
const logger = require('hmpo-logger').get();
logger.debug('This is a debug message');
```

To enable verbose logging in your application, set `appLevel` to `debug` in your hmpo-logger config:
```javascript
const hmpoLogger = require('hmpo-logger');
hmpoLogger.config({
    console: true,
    consoleLevel: 'debug'
});
const logger = hmpoLogger.get();
logger.debug('This is a debug message.');
```

## API Reference

### `get(name)`

Get a named logger. The name places in the `label` log property and is prepended to the console log entry messages.

```javascript
require('hmpo-logger').get(name);
```

If name is ommited it is guessed from the nearest package.json file found in the calling package:
```javascript
require('hmpo-logger').get();
```

If name begins with a colon it is appended to the guessed name:
```javascript
require('hmpo-logger').get(':subname');
```
Returns a `winston` logger.

### `logger.trimHtml(text, maxLength)`

Trim tags out of an HTML string to help with more concise HTML error response logging.  
Defaults to a `maxLength` of 400.

Returns a string, or passes through `text` if not a string.

### `config(options)`

Initialise the logger at the top level of the app, specifying the log locations and logging levels of three pre-defined transports: `console`, `app`, and `error`.

Returns `hmpoLogger`.

```javascript
const hmpoLogger = require('hmpo-logger');
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
*Note: configure the logger as early as possible in code before the logger gets used to avoid config issues.*

### `middleware()`

Log incomming requests from an `express` app.

```javascript
const hmpoLogger = require('hmpo-logger');

const app = require('express')();
app.use(hmpoLogger.middleware());
```

Returns express compatible middleware

## Rotating Logfiles

The config supports rotation based on the date using the `File` transport.

```
  dateRotate: true,
  maxFiles: 5, // keep 5 rotated files
```
Log file naming follows this pattern:
The names of the log files will include the year, month, and day and will be based on the log filename, eg:
```
/path/name.log
/path/name-YYYY-MM-DD.log
```

### Additional transport options
Custom transport options can be specified for console, app, and error logs:
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

New transports can be added using:
```
hmpoLogger.addTransportClass(Class, name)
```

New formatters can be added with
```
hmpoLogger.addFormatter(formatterFnFactory, name)
```
