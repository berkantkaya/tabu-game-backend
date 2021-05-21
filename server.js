var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, {
    cors: {
      origin: '*',
    }
});
var cors = require('cors');

app.use(cors())

// Oyuncu bağlantılarını yönetin
io.on("connection", function (socket) {
    const key = makeid(5);
    console.log("key", key);
    socket.send(key);

    socket.to(key).emit(`odaya katıldın ${key}`);
});

http.listen(3000, () => {
  console.log(" Listening on 3000");
});



function makeid(length) {
    var result           = [];
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result.push(characters.charAt(Math.floor(Math.random() * 
 charactersLength)));
   }
   return result.join('');
}
