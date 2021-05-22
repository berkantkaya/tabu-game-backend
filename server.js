const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
var _ = require('lodash');

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

var teamTypes = {
  NONE: "none",
  FIRST_TEAM: "firstTeam",
  SECOND_TEAM: "secondTeam",
};

var wordCardList = [
  {
    title: "Fantazi",
    banned: ["Seks", "Hayal", "Cinsellik", "İç Çamaşırı", "Müzik"]
  },
  {
    title: "Tuş",
    banned: ["Parmak", "Klavye", "Basmak", "Daktilo", "Vurmak"]
  },
  {
    title: "Feryat",
    banned: ["Etmek", "Haykırış", "Figan", "Çığlık", "Bağırmak"]
  },
  {
    title: "Kaldırım",
    banned: ["Yaya", "Araba", "Geçit", "Kaza", "Yürümek"]
  },
  {
    title: "Kibrit",
    banned: ["Çöp", "Çakmak", "Ateş", "Sigara", "Yakmak"]
  },
  {
    title: "Tombala",
    banned: ["Torba", "Oyun", "Oynamak", "Çekmek", "Numara"]
  },
  {
    title: "Akbil",
    banned: ["İett", "Otobüs", "Boş", "Basmak", "İstanbul"]
  },
  {
    title: "Peltek",
    banned: ["Tutuk", "Ses", "Konuşma", "Kusur", "Titrek"]
  },
  {
    title: "Anonim",
    banned: ["İsimsiz", "Bilinmeyen", "Edebiyat", "Şiir", "Belirsiz"]
  },
]

var rooms = {};

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("createRoom", () => {
    const newRoom = createKey(5);
    rooms[newRoom] = {
      game: {
        isStarted: false,
        raund: 1,
        time: 0,
        activeCard: 0,
        wordCards: [],
        narrator: "",
        firstTeamScore: 0,
        secondTeamScore: 0,
      },
      players: [
        {
          id: socket.id,
          username: "",
          team: teamTypes.NONE,
        },
      ],
    };

    console.log("CREATE_ROOM socket-id", socket.id);
    console.log("----", socket.id);
    console.log("ROOMS", rooms);

    socket.join(newRoom);

    socket.emit("created", newRoom, rooms[newRoom]);
  });

  socket.on("joinRoom", (room) => {
    console.log("JOIN_ROOM", room);

    if (room) {
      var player = rooms[room].players.find((i) => i.id === socket.id);

      console.log("joinRoom, player", player);
      if (player) {
      } else {
        player = {
          id: socket.id,
          username: "",
          team: teamTypes.NONE,
        };

        rooms[room].players.push(player);

        socket.join(room);
      }

      console.log("joinRoom, room", rooms[room]);

      socket.emit("me", player);

      io.sockets.to(room).emit("joined", rooms[room]);
    }
  });

  socket.on("set_username", (username) => {
    const { room, index } = getPlayerInfo(socket.id);

    rooms[room].players[index].username = username;

    socket.emit("set_me", rooms[room].players[index]);

    io.sockets.to(room).emit("joined", rooms[room]);
  });

  socket.on("join_to_team", (team) => {
    const { room, index } = getPlayerInfo(socket.id);

    rooms[room].players[index].team = team;

    io.sockets.to(room).emit("joined", rooms[room]);
  });

  socket.on("start_game", () => {
    const { room, index } = getPlayerInfo(socket.id);

    rooms[room].game.isStarted = true;
    rooms[room].game.time = 60;
    rooms[room].game.activeCard = 0;
    rooms[room].game.wordCards = _.sampleSize(wordCardList, 5);

    var firstTeam = rooms[room].players.filter(
      (i) => i.team === teamTypes.FIRST_TEAM
    );
    var secondTeam = rooms[room].players.filter(
      (i) => i.team === teamTypes.SECOND_TEAM
    );

    rooms[room].game.narrator = firstTeam[0].id;

    io.sockets.to(room).emit("joined", rooms[room]);

    var interval = setInterval(() => {
      if (rooms[room].game.time !== 0) {
        rooms[room].game.time -= 1;
      } else {
        rooms[room].game.time = 20;
        rooms[room].game.activeCard = 0;
        rooms[room].game.raund += 1;
        rooms[room].game.wordCards = _.sampleSize(wordCardList, 5);

        if (rooms[room].game.raund % 2 === 0) {
          rooms[room].game.narrator =
            secondTeam[Math.floor(Math.random() * secondTeam.length)].id;
        }

        if (rooms[room].game.raund % 2 === 1) {
          rooms[room].game.narrator =
            firstTeam[Math.floor(Math.random() * firstTeam.length)].id;
        }


      }

      io.sockets.to(room).emit("joined", rooms[room]);
    }, 1000);
  });

  socket.on("wrong_answer", () => {
    const { room, index } = getPlayerInfo(socket.id);

    if(rooms[room].game.raund % 2 === 0) {
      rooms[room].game.secondTeamScore -= 200;
    } else {
      rooms[room].game.firstTeamScore -= 200;
    }
    
    rooms[room].game.activeCard += 1;

    io.sockets.to(room).emit("joined", rooms[room]);
  });

  socket.on("correct_answer", () => {
    const { room, index } = getPlayerInfo(socket.id);

    if(rooms[room].game.raund % 2 === 0) {
      rooms[room].game.secondTeamScore += 400;
    } else {
      rooms[room].game.firstTeamScore += 400;
    }
    
    rooms[room].game.activeCard += 1;

    io.sockets.to(room).emit("joined", rooms[room]);
  });

  socket.on("pass", () => {
    const { room, index } = getPlayerInfo(socket.id);
    
    rooms[room].game.activeCard += 1;

    io.sockets.to(room).emit("joined", rooms[room]);
  });

  // socket.on("joinRoom", (room) => {
  //   socket.join(room);
  //   console.log("joinRoom: ", io.sockets.adapter.rooms);

  //   io.sockets.to(room).emit("katılanlar",io.sockets.adapter.rooms[room]);
  // });

  socket.on("disconnect", () => {
    console.log("disconnect user inital", rooms);

    var activeRoom;

    Object.keys(rooms).map((keyName, i) =>
      rooms[keyName].players.map((player) => {
        if (player.id === socket.id) {
          activeRoom = keyName;
        }
      })
    );

    if (activeRoom) {
      socket.leave(activeRoom);

      var player = rooms[activeRoom].players.find((i) => i.id === socket.id);
      var index = rooms[activeRoom].players.indexOf(player);
      if (index !== -1) {
        rooms[activeRoom].players.splice(index, 1);
      }

      io.sockets.to(activeRoom).emit("joined", rooms[activeRoom]);
    }

    console.log("disconnect user last", rooms);

    console.log("Got disconnect!", socket.id);
  });
});
server.listen(process.env.PORT || 5000, () => {
  console.log("listening on *:5000");
});

const getPlayerInfo = (socketId) => {
  var activeRoom;
  var index;

  Object.keys(rooms).map((keyName, i) =>
    rooms[keyName].players.map((player) => {
      if (player.id === socketId) {
        activeRoom = keyName;
      }
    })
  );

  if (activeRoom) {
    var player = rooms[activeRoom].players.find((i) => i.id === socketId);
    index = rooms[activeRoom].players.indexOf(player);
  }

  return {
    room: activeRoom,
    index: index,
  };
};

const createKey = (length) => {
  var result = [];
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result.push(
      characters.charAt(Math.floor(Math.random() * charactersLength))
    );
  }
  return result.join("");
};
