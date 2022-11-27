$(document).ready(function(){
    var socket = io.connect('http://localhost:3000');
    var username = req.session.username;
    socket.emit('join', username);
    
  
    // Listens for form submission
    $("#chatForm").on('submit', function(e){
      e.preventDefault();
      var message = $("#message").val();
      //Emitter tilbage til serveren om en ny besked
      socket.emit('new_message', message)
      $("#message").val("");
    })
  
    // adds HTML message to chat
    const addMessageToChat = (message) => {
      const messageElement = document.createElement('li');
      // Opgave 2 ...
  
      messageElement.innerText = new Date(message.timestamp).toLocaleTimeString('DK') 
        + ': ' + message.username 
        + ": " + message.message + " - "
  
      $("#messagesContainer").append(messageElement);
    }
  
  
    // On receiving one message: {username: '...', message: '...'}
    //backend
    //new_message objekt, den nye besked
    socket.on('new_message', function(message){
      console.log('message: ', message)
      addMessageToChat(message);
    })
  
  
    // on receiving a list of messages
    socket.on('messages', function(messages) {
      console.log('messages: ', messages)
      messages.forEach(message => {
        addMessageToChat(message);
      })
    })
  
    // On person joined chat
    socket.on('addChatter', function(name){
      var $chatter = $("<li>", {
        text: name,
        attr: {
          'data-name':name
        }
      })
      $("#chatters").append($chatter)
    })
  
    // On person disconnect
    socket.on("removeChatter", function(name){
      $("#chatters li[data-name=" + name +"]").remove()
    })
  })
  