var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var cookieParser = require('cookie-parser');

// cookieparser
app.use(cookieParser());

// Load and instantiate Chance
var chance = require('chance').Chance();

var cookieNickname;
var nickNames = {};
var nickColors = {};
var oldMessages = [];

// set a cookieNickname if it exists
app.use(function(req,res,next){
    let cookie = req.cookies.cookieName;
    if(cookie === undefined) {
        cookieNickname = undefined;
    }else{
        cookieNickname = cookie;
    }
    next();
});

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});



//a connection event is fired when a client connects to the server io
io.on('connection', function(socket){

    // Begin the setup
    createNickname();
    updateUsers();
    updateOldMessages();



    socket.on('send message', function(data) {
        var firstWord = data.split(' ')[0];
        var nickNameChange = '/nick';
        var nickColorChange = '/nickcolor';

        // check if it's a /nick request
        if (firstWord === nickNameChange) {
            checkNewNickname(data);
            // check if it's a /nickcolor request
        } else if (firstWord === nickColorChange) {
            nickColors[socket.id] = '#' + data.split(' ')[1];
            updateUsers();
            // send the required message
        } else {
            // send the message with all the info
            var message = {time: currentTime(), nickname: nickNames[socket.id], msg: data, color: nickColors[socket.id]};
            io.emit('new message', message);        // send out the message to all the users
            socket.emit('user text', 'bold');       // make user's text bold

            // make sure that empty presses are not saved in the old messages
            if (data.replace(/[^a-zA-Z0-9]/gi, '').length > 0) {
                replaceOldMessages(message);
            }
        }
    });

    // this event emits whenever a user disconnects
    // delete user and update others
    socket.on('disconnect', function(){
        delete nickNames[socket.id];
        delete nickColors[socket.id];
        updateUsers();
    });

    // check if the new nickname already exists and send the callback response (alert / update)
    function checkNewNickname(newNickname) {   // check new nickname
        var newNick = newNickname.split(' ')[1];

        for (var userName in nickNames) {
            // if the requested username is not unique, return
            if (nickNames[userName].toUpperCase() == newNick.toUpperCase()){
                socket.emit('nickname taken', newNick);
                return;
            }
        }
        // set the new nickname to the current user's socket
        nickNames[socket.id] = newNick;
        socket.emit('user nickname', newNick);
        updateUsers();

    };


    // get the current time
    function currentTime() {
        return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // get the list of nicknames
    function getNicknames(){
        nicknames = [];
        Object.keys(nickNames).forEach(function(key){
            nicknames.push(nickNames[key]);
        });
        return nicknames;
    }

    // Replace the old messages with the new ones
    // or just fill it up
    function replaceOldMessages(data){
        if(oldMessages.length <= 200){
            oldMessages.push(data);
        } else {
            oldMessages.shift();
            oldMessages.push(data);
        }
    }

    function createNickname(){

        // check for cookies
        // first time?
        if (cookieNickname === undefined) {
            // generate a random name for the user
            var userNameTest = chance.animal();

            // create a user with default color and a random name (length < 10)
            while (true) {
                if (userNameTest.length <= 10 && (nickNames[socket.id] !== userNameTest)) {
                    nickNames[socket.id] = userNameTest;
                    nickColors[socket.id] = '#708090';
                    cookieNickname = userNameTest;
                    break;
                } else {
                    userNameTest = chance.animal();
                }
            }
            socket.emit('user nickname', nickNames[socket.id]);
            // user already exists
        } else {
            nickNames[socket.id] = cookieNickname;
            nickColors[socket.id] = '#708090';
            socket.emit('user nickname', cookieNickname);
        }

    }

    // send back the list of nicknames to update online user
    function updateUsers(){
        io.emit('online users', JSON.stringify(getNicknames()));
    }

    // send back the list of old messages to update current user
    function updateOldMessages(){
        socket.emit('old messages', oldMessages);
    }
});










