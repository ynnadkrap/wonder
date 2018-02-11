import shortid from 'shortid'
import redis from './redis_client'

const UNPROCESSED = 'message:unprocessed'
const PROCESSING = 'message:processing'
const EXPIRE_DURATION_MS = process.env.EXPIRE_DURATION_MS || 1000 * 60 * 10

export default class WonderQ {
  static add(message) {
    var id = shortid.generate()

    redis.set(`message:${id}`, message)
    redis.sadd(UNPROCESSED, id)

    return id
  }

  static all(cb) {
    var timestamp = new Date().getTime()
    var client = redis.multi()

    client.smembers(UNPROCESSED, (err, ids) => {
      var keys = ids.map((id) => {
        redis.zadd(PROCESSING, timestamp, id)
        return `message:${id}`
      })

      redis.mget(keys, (err, messages) => {
        var response = messages.map((message, index) => ({ id: ids[index], message: message }))
        cb(response)
      })
    })
    client.del(UNPROCESSED)
    client.exec()
  }

  static mark_processed(id) {
    redis.del(`message:${id}`)
    redis.zrem(PROCESSING, id)
  }

  static reclaim_expired(cb) {
    var cutoff_ceiling = new Date().getTime() - EXPIRE_DURATION_MS

    redis.zrangebyscore(PROCESSING, 0, cutoff_ceiling, (err, ids) => {
      redis.sadd(UNPROCESSED, ids)
      if (cb) {
        cb(ids)
      }
    })
    redis.zremrangebyscore(PROCESSING, 0, cutoff_ceiling)
  }
}
