## Prerequisites

* The following must be installed:
    * Node.JS or IO.js
    * `npm`
    * `bower`
* Create a `config.js` at the root of the server directory for our DB connection info
    * See `examples/config.js`

## Deployment

Assuming you have the prereqs met, it's as simple as:

* npm install && npm start

Now you should be able to hit http://localhost:3000

We use nginx, see `examples/nginx.conf` for a sample config file that would go in `/etc/nginx/sites-enabled/<nameit>`

