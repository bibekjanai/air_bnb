const express=require("express");
const app=express();
const path=require("path");
const mongoose = require('mongoose');
const ejsMait=require("ejs-mate");
const trycatch=require("./utill/weapAsync.js");
const err=require("./utill/errhendal.js")
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user.js");
if(process.env.NODE_ENV !="production"){
    require('dotenv').config()
}
const dbUrl=process.env.db_url;
console.log(process.env.SECRET)

// Middleware setup
const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 3600,
    crypto:{
        secret:process.env.SECRET
    }

});
app.use(session({
    store:store,
    secret:process.env.SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 2628000000 },
}));



app.use(flash());
 
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var methodOverride = require('method-override');
app.use(methodOverride('_method'))
const { title } = require("process");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static( path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true  }));
app.engine('ejs', ejsMait);

const route=require("./routes/index.js");
app.use('/listings',route);

main().then(()=>{
    console.log("mongoose is working");
})
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(dbUrl);
}

app.listen(8080,()=>{
    console.log("app is started");
})
 







app.get("/", (req,res)=>{
    res.send("bibek jaan");
})





app.all("*",trycatch(async(req,res,next)=>{
    let num=new err(404,"page not found")
    next(num);
}))

app.use((err,req,res,next)=>{
   let {status=404,message="err"}=err;
   res.status(status).send(message);
});



// XbW7HbH0zaFQUe8O   bibekjana68