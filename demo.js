import WonderQ from './wonder_q'
import redis from './redis_client'

redis.flushall()

var msg1 = 'message 1'
var msg2 = 'message 2'
var msg3 = 'message 3'
var msg4 = 'message 4'

console.log('CREATING TWO MESSAGES')

WonderQ.add(msg1)
WonderQ.add(msg2)

console.log('CONSUMING MESSAGES')

WonderQ.all((messages) => {
  console.log('MESSAGES RECEIVED: ', messages)

  console.log(`MARKING ${messages[0].id} AS PROCESSED`)
  WonderQ.mark_processed(messages[0].id)

  console.log('CREATING THIRD MESSAGE')
  WonderQ.add(msg3)

  console.log('CREATING FOURTH MESSAGE')
  WonderQ.add(msg4)

  // This would probably go in a cron job
  // WonderQ.reclaim_expired

  process.exit()
})
