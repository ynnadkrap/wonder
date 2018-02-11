import WonderQ from '../wonder_q'
import { expect } from 'chai'
import redis from '../redis_client'

describe('WonderQ', () => {
  afterEach(() => {
    redis.flushall()
  })

  describe('#add', () => {
    var id;
    var message = 'this is a message'

    beforeEach(() => {
      id = WonderQ.add(message)
    })

    it('returns an identifier', () => {
      expect(id).to.be.a('string')
    })

    it('creates a new key where the value is the message', (done) => {
      redis.get(`message:${id}`, (err, msg) => {
        expect(msg).to.eq(message)
        done()
      })
    })

    it('adds the message id to message:unprocessed list', (done) => {
      redis.smembers('message:unprocessed', (err, res) => {
        expect(res).to.eql([id])
        done()
      })
    })
  })

  describe('#all', () => {
    var response
    var timestamp = new Date().getTime()
    var id1, id2

    beforeEach((done) => {
      id1 = WonderQ.add('message 1')
      id2 = WonderQ.add('message 2')

      WonderQ.all((messages) => {
        response = messages;
        done()
      })
    })

    it('returns messages that were in message:unprocessed', () => {
      var expectedResponse = [
        { id: id2, message: 'message 2' },
        { id: id1, message: 'message 1' }
      ]

      expect(response.length).to.eq(2)
      expect(response).to.have.deep.members(expectedResponse)
    })

    it('clears message:unprocessed', (done) => {
      redis.get('message:unprocessed', (err, reply) => {
        expect(reply).to.be.null
        done()
      })
    })

    it('adds the message id to message:processing (sorted set) with timestamp as order', (done) => {
      redis.zrangebyscore('message:processing', timestamp, '+inf', (err, reply) => {
        expect(reply).to.have.deep.members([id1, id2])
        done()
      })
    })
  })

  describe('#mark_processed', () => {
    var id;

    beforeEach(() => {
      id = WonderQ.add('some message')
      redis.zadd('message:processing', 12345, id)
      WonderQ.mark_processed(id)
    })

    it('removes the message key', (done) => {
      redis.get(`message:${id}`, (err, msg) => {
        expect(msg).to.be.null
        done()
      })
    })

    it('removes the messages from message:processing', (done) => {
      redis.zscore('message:processing', id, (err, reply) => {
        expect(reply).to.be.null
        done()
      })
    })
  })

  describe.only('#reclaim_expired', () => {
    var response

    beforeEach((done) => {
      redis.zadd('message:processing', 1, 'some-id')
      redis.zadd('message:processing', 2, 'some-id-2')
      redis.zadd('message:processing', new Date().getTime(), 'some-id-3')

      WonderQ.reclaim_expired((ids) => {
        response = ids
        done()
      })
    })

    it('returns the expired ids', () => {
      expect(response).to.have.members(['some-id', 'some-id-2'])
    })

    it('removes expired processing messages from message:processing', (done) => {
      redis.zrangebyscore('message:processing', '-inf', '+inf', (err, reply) => {
        expect(reply).to.deep.equal(['some-id-3'])
        done()
      })
    })

    it('adds the expired message ids back to message:unprocessed', (done) => {
      redis.smembers('message:unprocessed', (err, reply) => {
        expect(reply).to.have.members(['some-id', 'some-id-2'])
        done()
      })
    })
  })
})
