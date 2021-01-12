const express = require('express');
const mysql = require('mysql');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');

app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'musha',
//   password: 'password',
//   database: 'musha',
// });

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

let port = 3002;
console.log(`running ${port}`);
app.listen(port);
