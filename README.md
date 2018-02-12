# WonderQ

Message queue implementation using Redis.

## Usage

You must have redis running locally for these examples. You can find download/install instructions here:

`https://redis.io/download`

Clone the repo:

`git clone git@github.com:ynnadkrap/wonder.git`

Install packages:

`npm install`

Run tests:

`npm test`

Run demo:

`npx babel-node demo.js`

Check queue status:

`npx babel-node status.js`


note: the demo does not exhibit behavior that reclaims currently processing messages that have not been processed within a set amount of time. The functionality, however, is implemented and a test exhibits its behavior.

## Implementation Details

Redis was chosen for this implementation because of its high performance and data structure flexibility.

All messages are stored as key value pairs where the key is `message:message-id-here` and the value is the message.

All unprocessed messages are stored in a set where the key is `message:unprocessed` and the value is a set of message ids.

All messages being processed are stored in an ordered set where the key is `message:processing` and each item in the set has an order (unix epoch in milliseconds when the message start processing) and value (message id).

When a producer posts a message to the queue, a new unique id is created for the message and stored as a key and also inserted into the `message:unprocessed` set.

When a consumer asks for messages, all messages in `messages:unprocessed` are added to `messages:processing` and cleared from `messages:unprocessed` so that other consumers cannot see the same messages.

Messages in `message:processing` are deleted when a consumer marks it as processed using its id — its key:value (`message:message-id-here => this is the message`) is also removed from storage.

Messages are also removed from `message:processing` when its processing duration exceeds the allowed limit. The ability to 'reclaim' these messages exists, but you must decide when and how to execute. I suggest running a scheduled job. It is worth noting that Redis provides TTL/Expire functionality with notifications upon action. However, Redis states that "there can be a significant delay between the time the key time to live drops to zero, and the time the expired event is generated" `https://redis.io/topics/notifications`.

## Potential Endpoints

### Create Message
* **URL**

  `/messages`

* **Method:**

  `POST`

* **Data Params**

  **Required:**

  `message=[string]`

* **Success Response:**

  * **Code:** 201 <br />
    **Content:** `{ id : abc-123Qasc }`

* **Error Response:**

  * **Code:** 401 UNAUTHORIZED <br />
    **Content:** `{ error : "You are unauthorized to perform this action" }`

  OR

  * **Code:** 422 UNPROCESSABLE ENTRY <br />
    **Content:** `{ error : "Missing message" }`


### Get Messages
* **URL**

  `/messages`

* **Method:**

  `GET`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `[{ id : abc-123Qasc, message: 'message 1' }, ...]`

* **Error Response:**

  * **Code:** 401 UNAUTHORIZED <br />
    **Content:** `{ error : "You are unauthorized to perform this action" }`

### Delete Message
* **URL**

  `/message/:id`

* **Method:**

  `DELETE`

* **Success Response:**

  * **Code:** 204 <br />

* **Error Response:**

  * **Code:** 401 UNAUTHORIZED <br />
    **Content:** `{ error : "You are unauthorized to perform this action" }`

  OR

  * **Code:** 404 NOT FOUND <br />
    **Content:** `{ error : "Message does not exist" }`


## Scalability

Node is an ideal choice for this API server because its single-threaded nature lends itself well for the light CPU tasks required to interact with the Redis instance. We can use nginx to serve traffic to upstream node processes. We can lighten the load on our node processes by allowing nginx to handle load balancing, ssl, and caching.

Redis works well as the message queue because its ability to handle high volume I/O at lightning speeds. Since it's a simple key/value store we can easily partition it across multiple machines and utilize the machines' resources to power the Redis instance as I/O grows to massive scales.
