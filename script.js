const statusTypes = {
    NOT_CONNECTED: -1,
    WAITING_FOR_PLAYERS: 0,
    INGAME_OTHER_PLAYER_TURN: 1,
    INGAME_MY_TURN: 2,
    INGAME_STARTING_MY_TURN: 3,
    INGAME_STARTING_OTHER_PLAYER_TURN: 4,
    GAME_ALREADY_STARTED: 5,
}

var connectedPlayers=0;

var updateUI=function () {
 
    if(statusTypes.NOT_CONNECTED){

    }
}