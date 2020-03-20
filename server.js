var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var mongoose = require("mongoose");
var fs = require("fs");

app.get("/", function(req, res, next){

   res.sendFile(__dirname + "/static/index.html");

});

var url = "mongodb://localhost/chatdb";

mongoose.connect(url, {useNewUrlParser: true});
var db = mongoose.connection;
var dataSchema = new mongoose.Schema({

     key : String ,
     data : String

});

var dataModel = mongoose.model("data",dataSchema);

db.on("error", function(){

     console.log("oh oh oh ...");

});

db.once("connected", function(){

     console.log("MongoDb connected.");

});



var clients = {};
var chats = {};
var chatUtils = {};

io.on("connection", function(socket){ 


  console.log("one user connected : " + socket.id);


  //-->
  socket.on("join",function (data) {
        socket.join(data);
  });


  //-->
  socket.on("message",function(data){

     console.log("new data coming from android : "+data);

     if (data=="txt"){

	dataModel.find({key : data}, function(err, result){

	      if(err) throw err;
	      if (result != undefined){
	           io.to(socket.id).emit("message", result);
	      } else {
	           io.to(socket.id).emit("message","not message find in database.");
	      }

	});


     }else if(data=="delete"){

	dataModel.find({key : "txt"}).remove().exec();


     } else {

	 var newData = new dataModel({key : "txt" ,  data : data});
	 newData.save();

     }

  });


  //-->
  socket.on("channel",function (data) {
       
        socket.join(data,function(){
		
		console.log(socket.id + " now in rooms ", socket.rooms);
		chats[data] = data;
		io.in(data).emit("channel","you join to "+data);
	
	});

  });
  

  //-->
  socket.on("checkchannel",function (data) {

	var channel = chats[data];
	//if(){}  
	socket.join(channel,function(){
		
		console.log(socket.id + " now in rooms ", socket.rooms);
	
	});
	//io.to(socket.id).emit("gotochannel", channel);
	io.to(socket.id).emit("gotochannel", chatUtils[channel]);  
        
  });

  //-->
  socket.on("channelmessage",function (data) {

        var message=data["message"];
        var channel=data["channel"];

        console.log("channel message"+message);
        console.log("channel"+channel);

        io.in(channel).emit("channel",message);
    });

  //-->
  socket.on("deleteRoom",function (data) {

        delete chats[data];
        console.log("channel remove : "+chats[data]);

        io.in(data).emit("deleteRoom","delete room : "+data);
  });
	
  //-->
  socket.on("leaveRoom",function (data) {

	socket.leave(data,function(){

              io.in(data).emit("leaveRoom","user leave room : "+data);
              console.log("user leave room : "+chats[data]);

	});
  });	
	
  //-->
  socket.on("setChannelData",function (data) {
       
	var name=data["room"];
        var items=data["items"];  
        chatUtils[room] = items;

  });	


});

http.listen(3000);
console.log("server is running on port 3000");


/*
http.createServer(function(request, response){
   console.log("server is running on port 7000");
   response.writeHead(200, {"Content-type": "text/plain"});
   response.write("Hello Sadegh node.js");
   response.end();
}).listen(7000);
*/
