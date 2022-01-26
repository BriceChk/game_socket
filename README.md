# game_socket

A socket.io powered microservice to enable realtime games.

This is a class project for Reutlingen University.

## Setup

In `server.js` follow the first lines of comments to setup _http_ or _https_.

If you are using _https_, make sure to update the file paths for the key & certificate.

Run the server with  `node server.js`.

## Usage

Your client needs to use the [socket.io library](https://socket.io/).

### Events received by the server

**request-room:**

A game host can request a room for its game. The data sent by the game host is stored as _**gameData**_ and will be
transmitted to all players.

Once the room is allocated, the **room-created** event is sent to the game host, containing the **_gameCode_** of the
room:

`````json
{
  "gameCode": "HY65"
}
`````

Note: a client can only host one game.

***
**join-room:**

Used by a player to join a room. Needs the following parameters data:

`````json
{
  "username": "username1",
  "gameCode": "HY65"
}
`````

If the provided **_gameCode_** doesn't exist, the player will receive the `unknown-room` event.

If the game has already started, the player will receive the `game-already-started` event.

If the requested username is already used, the player will receive the `username-already-taken` event.

If the player successfuly joined the game, it will receive the _**gameData**_ with the `game-data` event, and the player
list will be broadcasted to the room with the `player-joined` event:

````json
{
  "players": [
    {
      "username": "username1",
      "score": 0
    }
  ]
}
````

***
**update-data:**

The game host can update and broadcast the game data to a room. The game status will remain unchanged and the data sent
with the event will replace the **_gameData_**.

All players will receive the `status-update` event:

````json
{
  "status": "playing [OR] waiting",
  "gameData": {
    "the": "game data provided by the game host"
  }
}
````

***
**start-game:**

The game host can set the game status to _playing_ and update the **_gameData_**. It uses the same data structure
as `update-data` and broadcasts the same `status-update` to all players.

***
**emit-event:**

The game host can broadcast an event to the room without data:

````json
{
  "eventName": "trigger-example"
}
````

This can be used to further manage the game on the clients.

***
**good-answer:**

This event can be used by the players to increment their score. It will broadcast the `player-list` event with updated
data to all players.

````json
{
  "players": [
    {
      "username": "username1",
      "score": 42
    }
  ]
}
````

***
**disconnect:**

This event is triggered when a client closes the connection.

If it is a player, it will be removed from the game it is playing and the `player-left` event will be broadcasted to the
room:

````json
{
  "username": "the-disconnected-user"
}
````

If it is the game host, all players will receive the `game-host-quit` event and the game will be destroyed.
