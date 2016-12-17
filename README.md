# Redis Adapter - With Sentinel Support (ioredis)

source code at [sails-ioredis](https://github.com/Salakar/sails-ioredis)

## Install

Install is through NPM.

```bash
$ npm install ioredis-extend
```

Set your connection adapter to 'ioredis-extend'

## Configuration

The following connection configuration is available:

```javascript
// default values inline
config: {
  port: 6379,
  host: 'localhost',
  password: null,
  db: null,
  // SENTINEL CONFIG:
  // sentinels: [{ host: 'host1', port: 26379 },{ host: 'host2', port: 26379 }, ...]  // array of sentinel servers
  // name: 'master', // name of the sentinel master

  // USING WITH CLUSTER:
  hosts: [{ host: 'host1', port: 26379 },{ host: 'host2', port: 26379 }, ...],
  // ^--- if you specify an array of hosts the adapter will use ioredis cluster instead
};
```

#### Low-Level Configuration (for redis driver)

See options at: https://github.com/luin/ioredis

## MIT License

See `LICENSE`.

