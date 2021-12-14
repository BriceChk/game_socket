const https = require('https');
const {Server} = require("socket.io");

const fs = require('fs');

const options = {
    key: fs.readFileSync('privkey.pem'),
    cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options, (req, res) => {
    res.writeHead(200);
    res.end('hello world!\n');
});
const io = new Server(server);

server.listen(3000, () => {
    console.log('listening on *:3000');
});

let roomsExample = {
    'QC34V': {
        'players': [
            {
                username: 'myusername',
                score: 42
            }
        ],
        'qweezId': 'azeaz^podsflgfjqklfjqe',
        'currentQuestionIndex': 0,
        'status': 'waiting/playing'
    }
}

let rooms = {};

io.on('connection', (socket) => {
    socket.on('request-room', async function (msg) {
        console.log('Room request');
        let {qweezId} = msg;

        // Generate a 6 char code
        let gameCode;
        do {
            gameCode = makeid(4)
        } while (Object.keys(rooms).includes(gameCode));

        // Create the room
        rooms[gameCode] = {
            'players': [],
            'qweezId': qweezId,
            'currentQuestionIndex': 0,
            'status': 'waiting',
        }
        socket.myGame = gameCode;

        // Join socket room
        socket.join(gameCode);

        socket.emit('room-created', {
            gameCode: gameCode,
            url: 'https://qweez-app.web.app/play/' + gameCode
        });
    });

    socket.on('join-room', async function (msg) {
        console.log('Join');
        let {gameCode, username} = msg;
        username = username.trim();

        // Check game code
        if (!Object.keys(rooms).includes(gameCode)) {
            socket.emit('unknown-room');
            return;
        }

        let room = rooms[gameCode];

        // Check game status
        if (room.status === 'playing') {
            socket.emit('game-already-started');
            return;
        }

        // Check username
        for (const p of room.players) {
            if (p.username === username) {
                socket.emit('username-already-taken');
                return;
            }
        }

        // Store username
        socket.username = username;
        socket.joinedGame = gameCode;

        // Add player to room
        socket.join(gameCode);
        rooms[gameCode].players.push({
            username: username,
            score: 0
        });

        // Send Qweez ID
        socket.emit('qweez-id', {
            qweezId: room.qweezId,
        });

        // Broadcast user join
        io.to(gameCode).emit('player-joined', {
            players: rooms[gameCode].players,
        });
    });

    socket.on('start-game', async function () {
        if (socket.myGame) {
            rooms[socket.myGame].status = 'playing';
            io.to(socket.myGame).emit('status-update', {
                'status': 'playing',
                'questionIndex': 0,
            });
        }
    });

    socket.on('next-question', async function () {
        if (socket.myGame) {
            rooms[socket.myGame].status = 'playing';
            rooms[socket.myGame].currentQuestionIndex++;
            io.to(socket.myGame).emit('status-update', {
                'status': 'playing',
                'questionIndex': rooms[socket.myGame].currentQuestionIndex,
            });
        }
    });

    socket.on('show-result', async function () {
        if (socket.myGame) {
            io.to(socket.myGame).emit('show-result');
        }
    });

    socket.on('good-answer', async function () {
        if (socket.joinedGame) {
            rooms[socket.joinedGame].players.forEach(value => {
                if (value.username === socket.username) {
                    value.score++;
                }
            });
            io.to(socket.joinedGame).emit('player-list', {
                players: rooms[socket.joinedGame].players
            });
        }
    });

    socket.on('disconnect', async function () {
        // Disconnect all users of the started game
        if (socket.myGame) {
            io.to(socket.myGame).emit('game-host-quit');
            delete rooms[socket.myGame];
            io.to(socket.myGame).disconnectSockets();
        }

        // Disconnect from game in waiting status
        if (socket.joinedGame) {
            let room = rooms[socket.joinedGame];
            if (room.status === 'waiting') {
                io.to(socket.joinedGame).emit('player-left', {
                    username: socket.username
                });

                rooms[socket.joinedGame].players = room.players.filter(value => value.username !== socket.username);
            }
        }
    });
});

function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}