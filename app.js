const express = require('express');
const mysql = require('mysql');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');

app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

const arr = require('./.db_sec_info.js');
const connection = mysql.createConnection({
  host: arr.host,
  user: arr.dbuser,
  password: arr.dbpassword,
  database: arr.db,
});

app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

app.get('/', (req, res) => {
  res.render('top.ejs');
})

app.get('/login', (req, res) => {
  res.render('login.ejs');
})

app.get('/regist', (req, res) => {
  res.render('regist.ejs');
})

app.get('/regist_done', (req, res) => {
  res.render('regist_done.ejs');
})

app.get('/home', (req, res) => {
  res.render('home.ejs');
})

let port = 3002;
console.log(`running ${port}`);
app.listen(port);
