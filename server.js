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

io.on("connection", function(socket){ 


  console.log("one user connected : " + socket.id);

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
