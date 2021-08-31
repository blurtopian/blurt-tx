# blurt-tx

Lightweight and complete JavaScript library for using Blurt blockchain in Javascript environments such as Web or NodeJS.

#### Why this?

Most lightweight library to use in your applications.

Some libraries are not easy to integrate and in some cases are incompatible with some frameworks like [Nativescript](https://www.nativescript.org/)

This library is a solution to such cases when official libraries are not working. And also an lightweight alternative for other libraries.

## Installation

```
npm install blurt-tx --save
```

## Usage

**Browser:**

```
<script src="https://cdn.jsdelivr.net/npm/hive-tx/dist/hive-tx.min.js"></script>
```

or

```
<script src="dist/blurt-tx.min.js"></script>
```

`blurtTx` is available after including /dist/blurt-tx.min.js file in your html file.

**NodeJS:**

```
const blurtTx = require('blurt-tx')
```

## Usage examples

**Configuration**

Set or get configs:

```
// default values already defined in config.js
blurtTx.config.node = 'https://rpc.blurt.world'
blurtTx.config.chain_id = 'cd8d90f29ae273abec3eaa7731e25934c63eb654d55080caff2ebb7f5df6381f'
blurtTx.config.address_prefix = 'BLT'
```

**Create transaction:**

```
const tx = new blurtTx.Transaction(trx?)
```

or

```
const tx = new blurtTx.Transaction()
tx.create(operations, expiration = 60)
```

Example:

```
const operations = [
  [
    'vote',
    {
      voter: 'guest123',
      author: 'guest123',
      permlink: '20191107t125713486z-post',
      weight: 9900
    }
  ]
]

const tx = new blurtTx.Transaction()
tx.create(operations).then(() => console.log(tx.transaction))
```

**Sign transaction:**

```
const myKey = '5JRaypasxMx1L97ZUX7YuC5Psb5EAbF821kkAGtBj7xCJFQcbLg'
const privateKey = blurtTx.PrivateKey.from(myKey)

tx.sign(privateKey)
console.log(tx.signedTransaction)
```

**Broadcast transaction:**

```
tx.broadcast().then(res => console.log(res))
```

**Make node call:**

```
blurtTx.call(method, params = [], timeout = 10): Promise
```

Example:

```
blurtTx.call('condenser_api.get_accounts', [['mahdiyari']]).then(res => console.log(res))
```

## License

MIT

Note: In building some parts we used functions from [dsteem](https://github.com/jnordberg/dsteem) library
