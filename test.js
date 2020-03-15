

var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var mongo = require("mongodb");
var fs=require("fs");
var MongoClient = require('mongodb').MongoClient;


//app.use(express.static(__dirname+"/static"));
app.get("/", function (req, res, next) {
    res.sendFile(__dirname + "/static/index.html");
});

var url = "mongodb://localhost:27017/chatdb";

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("chatdb");
    dbo.createCollection("tbl_chat", function(err, res) {
        if (err) throw err;
        //console.log("Collection created!");
        db.close();
    });
});
MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("chatdb");
    dbo.createCollection("readmessage", function(err, res) {
        if (err) throw err;
       // console.log("Collection created!");
        db.close();
    });
});
MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("chatdb");
    dbo.createCollection("channel", function(err, res) {
        if (err) throw err;
        //console.log("Collection created!");
        db.close();
    });
});


var clients = {};

io.on("connection", function (socket) {
    console.log("one user connected " + socket.id);



    for (var client in clients) {

        console.log(clients);
    }

    socket.on("nickname", function (data) {

        clients[data] = socket.id;
        socket.nickname = data;



    });

    for (var client in clients) {
        console.log(clients);
    }

    socket.on("channel",function (data) {
        var name=data["room"];
        var kind=data["kind"];
        var admin=data["id"];



        socket.join(data);
        io.in(data).emit("channel","you join to "+name);

        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var channelInfo = { admin: admin, name: name,kind:kind };
            db.collection("channel").insertOne(channelInfo, function(err, res) {
                if (err) throw err;
                console.log("1 document inserted");
                db.close();
            });
        });

    });
    
    
    
    socket.on("picture",function (data) {
        var b64string = data["pic"];
        //var buf = new Buffer(b64string, 'base64');
        var channel=data["from"];
        socket.join(channel);
        var data = b64string.replace(/^data:image\/\w+;base64,/, "");
        var buf = new Buffer(data, 'base64');
        fs.writeFile('upload/image.png', buf);

        console.log(channel);
        io.in(channel).emit("pic",b64string);

    });
    
    
    socket.on("join",function (data) {
        socket.join(data);
    });
    socket.on("channelmessage",function (data) {

        var message=data["message"];
        var channel=data["channel"];

        console.log("channel message"+message);
        console.log("channel"+channel);

        io.in(channel).emit("channel",message);
    });

    socket.on("checkchannel",function (data) {

        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var query = {name:data };
            db.collection("channel").find(query).toArray(function(err, result) {
                if (err) throw err;
                socket.join(result["name"]);
                io.to(socket.id).emit("gotochannel", result);
                db.close();
            });
        });
    });
    socket.on("getallchats",function (data) {

        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var query = { to:data["from"],from:data["to"] ,read:"unread"};
            db.collection("tbl_chat").find(query).toArray(function(err, result) {
                if (err) throw err;
                io.to(socket.id).emit("getallchats", result);
                db.close();
            });
        });
    });

    socket.on("message", function (data) {

        var to = data["to"];
        var from = data["from"];
        var user = clients[to];
        var myself = clients[from];

        io.to(user).emit("message", {message: data["message"], from: data["from"]});
        io.to(myself).emit("message", {message: data["message"], from: data["from"]});

        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var chatInfo = { from: from, to: to,text:data["message"] ,read:"unread" };
            db.collection("tbl_chat").insertOne(chatInfo, function(err, res) {
                if (err) throw err;
                console.log("1 document inserted");
                db.close();
            });
        });


    });

    socket.on("readmessage", function (data) {
        //console.log(data["from"]);//erfan
       // console.log(data["to"]);//mojtaba

        var to = data["to"];
        var user = clients[to];//mojtaba

        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var query = { from: data["to"] };
            var newvalues = {$set:{read:"read"}  };
            db.collection("tbl_chat").updateMany(query, newvalues, function(err, res) {
                if (err) throw err;
                console.log("1 document updated");
                if(user!=undefined){
                    console.log(user);//online
                    io.to(user).emit("tickmessage",{read: data["from"]} );
                }else{
                    MongoClient.connect(url, function(err, db) {
                        if (err) throw err;
                        var readMessage = { contact: data["from"], myself: data["to"] ,done:0 };
                        db.collection("readmessage").insertOne(readMessage, function(err, res) {
                            if (err) throw err;
                            console.log("1 document inserted");
                            db.close();
                        });
                    });
                }


            });
        });

    });

    socket.on("getmessage", function (data) {

        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var query = { to: data ,read:"unread"};
            db.collection("tbl_chat").find(query).toArray(function(err, result) {
                if (err) throw err;
                io.to(socket.id).emit("recieveMessage", result);
                db.close();
            });
        });


    });

    socket.on("typing", function (data) {
        var to = data["to"];
        var from = data["from"];
        var user = clients[to];
        var myself = clients[from];
        io.to(user).emit("typing", {message: data["message"]});



    });

    socket.on("stoptyping", function (data) {
        var to = data["to"];
        var from = data["from"];
        var user = clients[to];
        var myself = clients[from];
        io.to(user).emit("stoptyping", {message: data["message"]});
    });

    socket.on("disconnect", function () {
        console.log("user disconnected");
    })


});


http.listen(8000);
console.log("server run on port 8000");


/*
var http = require('http') ; 

var server = http.createServer( function(req , resp) {
//    console.log(req) ; 
    resp.writeHead(200 , {"Content-Type" : "text\plain"}) ; 
    resp.end("Bashe vasl shodi ! :)") ; 
})

server.listen(8000) ; 
console.log("server running on port 8000") ; 
*/
