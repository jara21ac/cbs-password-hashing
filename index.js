const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const port = 3000;
const sqlite3 = require('sqlite3').verbose();
var crypto = require('crypto');
app.use(express.static(__dirname + '/public'));
const server = require("http").createServer(app);


// Sqlite ting
const db = new sqlite3.Database('./db.sqlite');

db.serialize(function() {
  console.log('creating databases if they don\'t exist');
  db.run('create table if not exists users (userId integer primary key, username text not null, password text not null)');
});


// Tilføjer user til db
const addUserToDatabase = (username, password) => {
  db.run(
    'insert into users (username, password) values (?, ?)', 
    [username, password], 
    function(err) {
      if (err) {
        console.error(err);
      }
    }
  );
}

const getUserByUsername = (userName) => {
  // Smart måde at konvertere fra callback til promise:
  return new Promise((resolve, reject) => {  
    db.all(
      'select * from users where userName=(?)',
      [userName], 
      (err, rows) => {
        if (err) {
          console.error(err);
          return reject(err);
        }
        return resolve(rows);
      }
    );
  })
}


const hashPassword = (password) => {
  const md5sum = crypto.createHash('md5'); 
  const salt = 'Some salt for the hash';
  return md5sum.update(password + salt).digest('hex');
}



app.use(express.static(__dirname + '/public'))

app.use(
    session({
        secret: "Keep it secret",
        name: "uniqueSessionID",
        saveUninitialized: false,
    })
);

app.get("/", (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect("/dashboard");
    } else {
        return res.sendFile("login.html", { root: path.join(__dirname, "public") });
    }
});


// Et dashboard som kun brugere med 'loggedIn' = true i session kan se
app.get("/dashboard", (req, res) => {
  if (req.session.loggedIn) {
    // Her generere vi en html side med et brugernavn på (Tjek handlebars.js hvis du vil lave fancy html på server siden)
    res.sendFile(__dirname + '/index.html');
  } else {
    return res.redirect("/");
  }
});



app.post("/authenticate", bodyParser.urlencoded(), async (req, res) => {
  
  
  // Opgave 1
  // Programmer så at brugeren kan logge ind med sit brugernavn og password

  // Henter vi brugeren ud fra databasen
  const users = await getUserByUsername(req.body.username)
  console.log({users}, req.body.password);

  if (users.length === 0) {
    console.log("Ingen user")
    return res.redirect("/")
  }

    

  // Hint: Her skal vi tjekke om brugeren findes i databasen og om passwordet er korrekt
  if (users[0].password === hashPassword(req.body.password)) {
      req.session.loggedIn = true;
      req.session.username = req.body.username;
      console.log(req.session);
      res.redirect("/dashboard");
  } else {
      // Sender en error 401 (unauthorized) til klienten
      return  res.sendStatus(401);
  }
});


app.get("/logout", (req, res) => {
  req.session.destroy((err) => {});
  return res.send("Thank you! Visit again");
});





app.get("/signup", (req, res) => {
  if (req.session.loggedIn) {
      return res.redirect("/dashboard");
  } else {
      return res.sendFile("signup.html", { root: path.join(__dirname, "public") });
  }
});

app.post("/signup", bodyParser.urlencoded(), async (req, res) => {
  const user = await getUserByUsername(req.body.username)
  if (user.length > 0) {
    return res.send('Username already exists');
  }

  // Opgave 2
  // Brug funktionen hashPassword til at kryptere passwords (husk både at hash ved signup og login!)
  addUserToDatabase(req.body.username, hashPassword(req.body.password));
  res.redirect('/');

})  


        //Socket

const db2 = new sqlite3.Database('./db.sqlite');

db2.serialize(function() {
  console.log('creating databases if they don\'t exist');
  db2.run('create table if not exists messages (messageid integer primary key, username text not null, message text, timestamp integer)');
});

// Tilføjer message til db `message: {username, message}`
const addMessageToDatabase = (message) => {
  db2.run(
    'insert into messages (username, message, timestamp) values (?, ?, ?)', 
    [message.username, message.message, Date.now()], 
    function(err) {
      if (err) {
        console.error(err);
      }
    }
  );
}


const getAllMessages = () => {
  // Smart måde at konvertere fra callback til promise:
  return new Promise((resolve, reject) => {  
    db2.all('select * from messages', (err, rows) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      return resolve(rows);
    });
  })
}



// socket IO ting
var io = require("socket.io")(server, {
    /* Handling CORS: https://socket.io/docs/v3/handling-cors/ for ngrok.io */
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
});



io.on('connection', function(socket){

  // Når en ny bruger joiner
  socket.on('join', async function(name){
    //Gemme brugernavn til den socket
    socket.username = name
    //Chat displayer navn
    io.sockets.emit("addChatter", name);
    
    //Når der ankommet en besked sendes den ud til alle
    const messages = await getAllMessages();
    io.sockets.emit('messages', messages);
    io.sockets.emit('new_message', {username: 'Server', message: 'Velkommen ' + name + '!'});

  });

  // Når server modtager en ny besked
  socket.on('new_message', function(message){
    // Opgave 1a ...

    addMessageToDatabase({message: message, username: socket.username});
    const username = socket.username
    console.log(username + ': ' + message);
    io.sockets.emit("new_message", {username, message});
  });
  
  // Når en bruger disconnecter
  socket.on('disconnect', function(name){
    io.sockets.emit("removeChatter", socket.username);
  });
});



// HTTP ting
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
  



app.listen(port, () => {
  console.log("Website is running");
});
