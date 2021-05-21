var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, GET, PATCH, DELETE, OPTIONS"
  );
  next();
});

// Oyuncu bağlantılarını yönetin
io.on("connection", function (socket) {
    const key = makeid(5);
    console.log("key", key);
    socket.join(key);

    io.to(key).emit(`odaya katıldın ${key}`);
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
