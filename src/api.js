const Movie = require('./movie');
const User = require('./user');
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const serverless = require('serverless-http');
var cors = require('cors')

const API_PORT = 8000;
const app = express();
var corsOptions = {
  // origin: 'https://infallible-shirley-baf3d7.netlify.app',
  // optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  origin:true,
  credentials:true
}

app.use(cors(corsOptions))
app.options('*', cors())
// app.all('', function(req, res, next) {
  //res.header("Access-Control-Allow-Origin", "https://infallible-shirley-baf3d7.netlify.app");
  // res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  // res.header('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  //Auth Each API Request created by user.
  // next();
// });
const router = express.Router();
/*
// this is our MongoDB database
const dbRoute =
'mongodb+srv://smp1613:smp1613@moviereviewsentiment-8qo0k.gcp.mongodb.net/test';
// connects our back end code with the database
mongoose.connect(dbRoute, { useNewUrlParser: true });
*/
const uri = 
"mongodb+srv://smp1613:smp1613@moviereviewsentiment-8qo0k.gcp.mongodb.net/moviedb";
const connectDB = async () =>{
  await mongoose.connect(uri,{
    useUnifiedTopology: true,
    useNewUrlParser: true
  })
  console.log("connected")
}
connectDB();
//let db = mongoose.connection;

//db.once('open', () => console.log('connected to the database'));

// checks if connection with the database is successful
//db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// (optional) only made for logging and
// bodyParser, parses the request body to be a readable json format
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// this is our get method
// this method fetches all available data in our database

router.get('/', (req,res)=>{
  res.send({hello:'world'})
})
router.get('/getMovieIdList',(req, res) => {  
  Movie.find({},{_id:1,poster:1,name:1,rated:1},{limit:50}, (err,movies)=>{
    if(err)
    res.send({error:err});
    else
        //res.send({movies: movies.cast[movies.cast.length-1]});
        //res.json({movies: movies.cast[movies.cast.length-1]})
        res.json({movies: movies})
  })
});
router.get('/getMovieIdListMod', (req, res) => {    
  let page = 1, limit= 10,offset = 10;
  let genre = 'all';
  try{
    page = parseInt(req.query.page);
    limit = parseInt(req.query.limit);
    genre = req.query.genre;
    if(genre===undefined)
      genre = "all";    
    offset = (page-1)*limit;
   // console.log('page',page, ' limit ', limit, ' skip', offset)
   if(genre == "all"){
      Movie.find({},{_id:1,poster:1,name:1,rated:1},{limit:limit, skip: offset}, (err,movies)=>{
        if(err)
            res.send({error:err});
        else          
            res.json({movies: movies})
      })
    }
    else{
      console.log("genre", genre)
      Movie.find({genre: { "$in" : [genre]} },{_id:1,poster:1,name:1,rated:1},{limit:limit, skip: offset}, (err,movies)=>{
        if(err)
            res.send({error:err});
        else          
            res.json({movies: movies})
      })
    }
  }catch(err){
    res.send({error: err})
  }
});
router.get('/getMovieDetails',(req, res) => {  
  let id = req.query.id  
  console.log(id);
  Movie.findOne({_id:id}, (err,movie)=>{
    if(err)
        res.send({error:err});
    else
        //res.send({movies: movies.cast[movies.cast.length-1]});
        //res.json({movies: movies.cast[movies.cast.length-1]})
        res.json({movie: movie})
  })
});
router.post('/getMovieDetailsWithIds', (req, res) => {  
  let ids = req.body.ids;
  let oids = [];
  console.log(ids);
  for (let index = 0; index < ids.length; index++) {
    const element = ids[index];
    oids.push(mongoose.Types.ObjectId(element));
  }  
  Movie.find({_id:{$in:oids}},{_id:1,poster:1,name:1,rated:1}, (err,movies)=>{
    if(err)
        res.send({error:err});
    else        
        res.json({movies: movies})
  })
});
router.get('/getMovieByName', (req, res) => {    
  Movie.find({name: { "$regex" : req.query.name, $options: 'i' } },{_id: 1,name:1,poster:1},{limit: 10}, (err,movies)=>{
    if(err)
        res.send({error:err});
    else          
        res.json({movies: movies})
  })
});
function verifyToken(req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).send('Unauthorized Request')
  }
  let token = req.headers.authorization.split(' ')[1]
  if (token == null) {
    return res.status(401).send('Unauthorized Request')
  }
  let payload = jwt.verify(token, 'secretKey')
  if (!payload) {
    return res.status(401).send('Unauthorized Request')
  }

  req.userId = payload.subject
  next()
}
router.post('/login', function (req, res) {
  let userData = req.body;

  User.findOne({ email: userData.email }, function (err, user) {
    if (err) {
      console.log(err)
    }
    else {
      if (!user) {
        res.status(401).send('Invalid email')
      }
      else {
        if (user.password !== userData.password) {
          res.status(401).send('Invalid Password')
        }
        else {
          let payload = { subject: user._id }
          let token = jwt.sign(payload, 'secretKey')
          res.status(200).send({ token, user })
        }
      }
    }
  })
});
router.post('/register', function (req, res) {
  let userData = req.body
  let user = new User(userData)
  user.save(function (err, registeredUser) {
    if (err) {
      console.log(err)
    }
    else {
      let payload = { subject: registeredUser._id }
      let token = jwt.sign(payload, 'secretKey')
      res.status(200).send({ token, registeredUser })
    }
  })
});
router.post('/addWatchLater', function (req, res) {

  let email = req.body.email;
  let mid = req.body.movieid;
  User.findOneAndUpdate({email:email},{$push:{favourite_list:mid}},{useFindAndModify: false}, (err, succ)=>{
    if(err){
      console.log(err);
      res.status(200).send(err);
    }    
    else{
      console.log(succ);
      res.status(200).send(succ);
    }
  })  
});
router.post('/removeWatchLater', function (req, res) {

  let email = req.body.email;
  let mid = req.body.movieid;
  User.findOneAndUpdate({email:email},{$pullAll:{favourite_list:[mid]}},{useFindAndModify: false}, (err, succ)=>{
    if(err){
      console.log(err);
      res.status(200).send(err);
    }    
    else{
      console.log(succ);
      res.status(200).send(succ);
    }
  })  
});
router.post('/PostReview', (req, res) => {
  let id = req.body.mid;
  console.log(req.body);
  Movie.findOne({ _id: id }, (err, movie) => {
    if (err){
      res.send({ error: err });
    }
    else{
      let req_review = req.body.values;  
      let reviewobj = {
        imdb_rating: req_review.stars,
        our_rating: 0,
        aho_label: 0,  
        heading: req_review.title,        
        review: req_review.content
      }; 
      console.log(reviewobj);
      movie.reviews.push(reviewobj);      
      res.json({ review: movie.reviews })
      movie.save();      
  }
  })
});
router.get('/test',(req,res)=>{    
    Movie.findOne({},{_id:1,poster:1,name:1,rated:1}, (err,movies)=>{
        if(err)
            res.send({error:err});
        else
            //res.send({movies: movies.cast[movies.cast.length-1]});
            //res.json({movies: movies.cast[movies.cast.length-1]})
            res.json({movies: movies})
      })
});
app.use('/.netlify/functions/api', router);

// launch our backend into a port
//app.listen(API_PORT, () => console.log(`LISTENING ON PORT ${API_PORT}`));

module.exports.handler = serverless(app);