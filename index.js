// Game data //

// Seçim destesi
const cardList = [
    {
        word: "Holigan",
        forbiddenWords: ["ahmet", "mehmet"]
    }
]

const statusTypes = {
    NOT_CONNECTED: -1,
    WAITING_FOR_PLAYERS: 0,
    INGAME_OTHER_PLAYER_TURN: 1,
    INGAME_MY_TURN: 2,
    INGAME_STARTING_MY_TURN: 3,
    INGAME_STARTING_OTHER_PLAYER_TURN: 4,
    GAME_ALREADY_STARTED: 5,
}

 //Oyun durumu (çoğunlukla müşteri için)

 var state = statusTypes.WAITING_FOR_PLAYERS;
 
 // Takımlar
 const BLUE_TEAM = 0;
 const RED_TEAM = 1;
 
 // Oyun Parametreleri
 var game_maxTime = 60000;
 var game_maxSkip = 3;
 
 //  Mevcut oyunla ilgili tüm bilgileri içerir
 var Match = function ( ) {
    // Current player
    this.curTeam = BLUE_TEAM;
    this.turnTeamPlayer = [statusTypes.NOT_CONNECTED, statusTypes.NOT_CONNECTED];
    this.player = undefined;
 
    // Zamanlayıcı
    this.time = 0;
    this.maxTime = game_maxTime;
    this.timerHandle = -1;
 
    // Skorlsr
    this.score = [ 0, 0 ];
 
    // Mevcut Kart
    this.card = [];
 
    // Seçim destesi
    this.deck = cardList;
 
    //aynı kartı tekrar tekrar cekmekten kutarmak icin 
    this.history = [];
 
    // Sayımı atla
    this.skips = 0;
    this.maxSkips = game_maxSkip;
 
    // Yeni bir kart çekip doğru oyuncuya gönderir
    this.drawCard = function ( ) {
       var idx = Math.floor(Math.random() * this.deck.length);
       while ( this.history.includes(idx) )
          idx = Math.floor(Math.random() * this.deck.length);
 
       this.card = this.deck[idx];
       this.history.push ( idx );
 
       if ( this.history.length == this.deck.length ) {
          console.log ( "[GAME] resetting deck" );
          this.history.splice(0, this.history.length);
       }
 
       this.player.emit ( "card", this.card );
 
       for ( let i = 0; i < clients.length; ++i )
          if ( clients[i].team != this.player.team )
             clients[i].emit ( "card", this.card );
    }
 
    //   aslında başla

    this.preStartTurn = function ( ) {
       // Oyuncuyu seçin
       do {
          this.curTeam = 1 - this.curTeam;
       } while ( teams[this.curTeam].length == 0 );
 
       this.turnTeamPlayer[this.curTeam]++;
       if ( this.turnTeamPlayer[this.curTeam] >= teams[this.curTeam].length )
          this.turnTeamPlayer[this.curTeam] = 0;
 
       this.player = teams[this.curTeam][this.turnTeamPlayer[this.curTeam]];
 
       console.log ( "[GAME] client " + this.player.info() + " turn is about to start" );
 
       // Durumları kullanıcılara iletin
       io.emit ( "teamTurn", this.player.team );
       io.emit ( "nameTurn", this.player.name );
       io.emit ( "score", this.score );
       this.player.emit ( "state", INGAME_STARTING_MY_TURN );
 
       this.skips = this.maxSkips;
       this.player.emit ( "skips", this.skips );
 
       for ( let i = 0; i < clients.length; ++i )
          if ( clients[i].id != this.player.id )
             clients[i].emit ( "state", INGAME_STARTING_OTHER_PLAYER_TURN );
    }
 
    // Yeni bir tur başlatır
    this.startTurn = function ( ) {
       this.time = this.maxTime;
 
       console.log ( "[GAME] client " + this.player.info() + " turn starts now" );
 
       // Durumları kullanıcılara iletin
       this.player.emit ( "state", INGAME_MY_TURN );
       for ( let i = 0; i < clients.length; ++i )
          if ( clients[i].id != this.player.id )
             clients[i].emit ( "state", INGAME_OTHER_PLAYER_TURN );
 
       this.drawCard();
 
       this.timerHandler = setInterval ( (function() {
          this.time -= 10;
          io.emit ( "time", this.time );
          if ( this.time <= 0 ) this.endTurn();
       }).bind(this), 10 );
    }
 
    // Dönüşün sonu
    this.endTurn = function ( ) {
       clearInterval ( this.timerHandler );
       console.log ( "[GAME] client " + this.player.info() + " turn ends" );
 
       this.preStartTurn();
    }
 
    // Doğru cevap
    this.correct = function ( ) {
       this.score[this.player.team] += 1;
       io.emit ( "score", this.score );
       this.drawCard();
    }
 
    // Tabu Dünyası
    this.taboo = function ( ) {
       this.score[this.player.team] -= 1;
       io.emit ( "score", this.score );
       this.drawCard();
    }
 
    // Atla
    this.skipCard = function ( ) {
       if ( this.skips <= 0 ) return;
 
       this.drawCard();
       this.skips--;
       this.player.emit ( "skips", this.skips );
    }
 
    //Oyunu sıfırla
    this.reset = function ( ) {
       this.score = [0, 0];
       clearInterval ( this.timerHandle );
 
       io.emit ( "ready", false );
       io.emit ( "state", WAITING_FOR_PLAYERS );
 
       state = WAITING_FOR_PLAYERS;
    }
 
    // Eşlesmeyi baslat
    this.startMatch = function () {
       // Reset game object
       this.reset();
 
       state = GAME_ALREADY_STARTED;
 
       // Oyun nesnesini sıfırlar
       this.preStartTurn();
    }
 }
 
 var match = new Match();
 
 // Server ////////////////////////////////////////////////////////////////
 
 var app = require('express')();
 var http = require('http').Server(app);
 var io = require('socket.io')(http);
 
 var clients = [];
 var teams = [ [], [] ];
 var lastId = 0;
 var readyCount = 0;
 
 //Takımları güncelle
 var updateTeams = function () {
    teams[0].splice(0, teams[0].length);
    teams[1].splice(0, teams[1].length);
 
    for ( var i = 0; i < clients.length; ++i )
       teams[clients[i].team].push(clients[i]);
 };
 
 // Oyuncu bağlantılarını yönetin
 io.on('connection', function(socket) {
    console.log("[SRVR] client " + lastId + " connected");
 
    // Register the client
    socket.id = lastId++;
    clients.push ( socket );
 
    // İstemci durumunu hazır değil olarak ayarla
    socket.ready = false;
 
    // Müşteri ekibini tanımsız olarak ayarlar
    socket.team = undefined;
    socket.name = undefined;
 
    // Oda durumunu ve çeşitli bilgileri gönder
    socket.emit ( 'id', socket.id );
    socket.emit ( 'state', state );
    socket.emit ( 'ready', socket.ready );
    io.emit ( 'connectedPlayers', clients.length );
    io.emit ( 'readyCount', readyCount );
 
    // Bilgi dizesi
    socket.info = function() { return this.name + "#" + this.id; }
 
    // Bağlantı kesilme olayı
    socket.on ( 'disconnect', function() {
       if ( state == GAME_ALREADY_STARTED && this.id == match.player.id )
          match.endTurn();
 
       //İstemciyi listeden kaldır
       for (let i = 0; i < clients.length; ++i) {
          if ( clients[i].id == this.id ) {
             clients.splice ( i, 1 );
             break;
          }
       }
 
       if ( this.ready )
          readyCount--;
 
       io.emit ( 'connectedPlayers', clients.length );
       console.log(" client " + this.info() + " disconnected");
 
       if ( clients.length == 0 ) {
          console.log(" no players left, resetting");
          state = WAITING_FOR_PLAYERS;
          match.reset();
       }
    } );
 
    //Hazır durum geçiş olayı
    socket.on ( 'ready', function() {
       this.ready = !this.ready;
 
       if ( this.ready ) {
          readyCount++;
          console.log(" client " + this.info() + " is ready");
       }
       else {
          readyCount--;
          console.log(" client " + this.info() + " is no longer ready");
       }
 
       io.emit ( "readyCount", readyCount );
       console.log(" " + readyCount + "/" + clients.length + " clients are ready" );
 
       // Tüm müşterilerin hazır olup olmadığını kontrol edin ve hazırsa oyunu başlatın
       if ( readyCount == clients.length ) {
          console.log(" All clients ready, starting game");
 
          // Setup and start the game
          match.startMatch();
       }
    });
 
    //Dönüş etkinliğini başlat
    socket.on ( 'startTurn', function() {
       if ( this.id == match.player.id ) {
          match.startTurn();
       }
    } );
 
    //Doğru cevap
    socket.on ( 'correct', function() {
       if ( this.id == match.player.id ) {
          match.correct();
       }
    } );
 
    // Tabu dünyası
    socket.on ( 'taboo', function() {
       if ( this.id == match.player.id ) {
          match.taboo();
       }
    } );
 
    // atla
    socket.on ( 'skip', function() {
       if ( this.id == match.player.id ) {
          match.skipCard();
       }
    } );
 
    // Takım Adı
    socket.on ( 'name', function(msg) {
       this.name = msg;
       console.log ( " client " + this.info() + " name set to " + this.name );
    } );
 
    // Takım ayarla
    socket.on ( 'team', function(msg) {
       this.team = msg;
       updateTeams();
       console.log ( " client " + this.info() + " team set to " + this.team );
    } );
 });
 
 
 http.listen(3000, function(){
    console.log(" Listening on 3000");
 } );