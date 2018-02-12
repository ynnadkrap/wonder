import redis from './redis_client'

var unprocessed, processing

redis.smembers('message:unprocessed', (err, ids) => {
  redis.mget(ids.map((id) => `message:${id}`), (err, messages = []) => {
    unprocessed = messages.map((message, index) => ({id: ids[index], message: message}))

    redis.zrange('message:processing', 0, -1, 'WITHSCORES', (err, results) => {
      var begin = 0
      var end = 1
      var formattedResults = []

      while (end <= results.length) {
        formattedResults.push({ id: results[begin], started_at: new Date(results[end] * 1).toISOString() })
        begin += 2
        end += 2
      }

      redis.mget(formattedResults.map((res) => `message:${res.id}`), (err, messages = []) => {
        processing = messages.map((message, index) => Object.assign(formattedResults[index], { message: message }))

        console.log('**********************************')
        console.log('Unprocessed messages')
        console.log('**********************************')
        console.log('count: ', unprocessed.length)
        console.log('messages: ', unprocessed)
        console.log('\n')
        console.log('**********************************')
        console.log('Messages currently being processed')
        console.log('**********************************')
        console.log('count: ', processing.length)
        console.log('messages: ', processing)
        process.exit()
      })
    })
  })
})
