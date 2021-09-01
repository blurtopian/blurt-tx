const axios = require('axios')
const config = require('../config')

/**
 * Make calls to hive node
 * @param {string}method - e.g. condenser_api.get_dynamic_global_properties
 * @param {Array}params - an array
 * @param {Number}timeout - optional - default 10 seconds
 */
const call = async (method, params = [], timeout = 10) => {
  console.log('config.node', config.node)
  let resolved = 0
  return new Promise((resolve, reject) => {
    axios
      .post(
        config.node,
        {
          "jsonrpc": '2.0',
          "method": method,
          "params": params,
          "id": 0
        }
      )
      .then(res => {
        console.log('call res.status', res.status);
        console.log('call res.data', res.data);
        if (res && res.status === 200) {
          resolved = 1
          resolve(res.data)
        }
      })
    setTimeout(() => {
      if (!resolved) {
        reject(new Error('Network timeout.'))
      }
    }, timeout * 1000)
  })
}

module.exports = call
