const express = require('express');
const mongodb = require('mongodb');
var objectId = require('mongodb').ObjectId;
const port=3000;
const app = express();

/**
 * function which creates a Connection to MongoDB. Retries every 3 seconds if noc connection could be established.
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function connectMongoDB() {
    try {
        //connect to database server
        app.locals.dbConnection = await mongodb.MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true });
        //connect do database "itemdb"
        app.locals.db = await app.locals.dbConnection.db("itemdb");
        console.log("Using db: " + app.locals.db.databaseName);
        
    }
    catch (error) {
        console.dir(error)
        setTimeout(connectMongoDB, 3000)
    }
}
//Start connecting
connectMongoDB()

//Make all Files stored in Folder "public" accessible over localhost:3000/public
app.use('/public', express.static(__dirname + '/public'))

//Share jquery over the server
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'))
//use jquery
app.use('/node_modules', express.static(__dirname + '/node_modules'))
//Send index.html on request to "/"
app.get('/', (req,res) => {
    res.sendFile(__dirname + '/index.html')
})
//Returns all items stored in collection items
app.get("/item", (req,res) => {
    //Search for all items in mongodb
    
    app.locals.db.collection('items').find({}).toArray((error, result) => {
        if (error) {
            console.dir(error);
        }
        res.json(result);
    });
});
//Returns specific item searched by id 
app.get("/search",(req,res) => {
    //Search for one item in mongodb
    let id = req.query.id;
    
    console.log(req.query);
    app.locals.db.collection('items').find({_id:new mongodb.ObjectID(id)}).toArray((error,result)=>{
        if(error){
            console.dir(error);
        }
        res.json(result);
    });
});
//Insert a new Item
app.post("/item",(req,res)=>{
    // insert item
console.log("insert item");
console.log(JSON.stringify(req.body));
app.locals.db.collection('items').insertOne(req.body,(error,result)=>{
    if(error){
        console.dir(error);
    }
    res.json(result);
});
});
app.put("/update", (req, res) => {
    // update item
    console.log("update item " + JSON.stringify(req.body));
    app.locals.db.collection('items').updateOne(
        { _id : new mongodb.ObjectID(req.body._id) },
        { $set: {features : req.body.features}},

        (error, result) => {
        if (error) {
            console.dir(error);
        }
        res.json(result);
        });
});
app.del("/delete", (req, res) => {
    // delete item
    console.log("delete item " + JSON.stringify(req.body));
    app.locals.db.collection('items').deleteOne(
        { _id : new mongodb.ObjectID(req.body._id) },
        (error, result) => {
            if (error) {
                console.dir(error);
            }
            res.json(result);
     });
});
    
    
// listen on port 3000
// listen on port 3000
const server = app.listen(port,
    () => console.log(`Example app listening at http://localhost:${port}`)
)
//Delete items while closing server
process.on("SIGINT", () => {
    server.close();
    app.locals.db.collection('items').deleteMany({});
    app.locals.dbConnection.close();
    console.log("SIGINT");
    process.exit(0);
});
// Send point_editor to "/editor" 
app.get('/editor', (req,res) => {res.sendFile(__dirname + '/public/point_editor/point_editor.html') })

