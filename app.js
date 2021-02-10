const express = require('express');
const mysql = require('mysql');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');

app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

// db info
const arr = require('./.db_sec_info.js');
const connection = mysql.createConnection({
 host: arr.host,
  user: arr.dbuser,
  password: arr.dbpassword,
  database: arr.db,
});

// app.use
app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);
app.use((req, res, next) => {
  if (req.session.userid === undefined) {
    console.log('ログインしていません');
    res.locals.isLoggedIn = false;
  } else {
    console.log('ログインしています');
    res.locals.userid = req.session.userid;
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
  }
  next();
});


app.get('/', (req, res) => {
  if(res.locals.isLoggedIn === false) {
    res.render('nologin_home.ejs');
  } else {
    res.render('home.ejs');
  }
})

app.get('/regist', (req, res) => {
  res.render('regist.ejs', {errors: []});
})
app.post('/regist', 
  (req, res, next) => {
    const username = req.body.regist_username;
    const password = req.body.regist_password;
    const again_password = req.body.regist_again_password;
    const errors = [];

    if (username === '') {
      errors.push('ユーザー名が入力されていません');
    }
    if (password === '' || again_password === '') {
      errors.push('パスワードが入力されていません');
    }
    if (password !== again_password) {
      errors.push('パスワードが異なっています');
    }
    if (password.length <= 3) {
      errors.push('パスワードは4文字以上です');
    }
    if (errors.length > 0) {
      res.render('regist.ejs', { errors: errors });
    } else {
      next();
    }
  },
  (req, res, next) => {
    console.log('ユーザー名重複チェック');
    const username = req.body.regist_username;
    const errors = [];
    connection.query(
      'SELECT * FROM users WHERE name = ?',
      [username],
      (error, results) => {
        if (results.length > 0) {
          errors.push('そのユーザー名は既に存在しています');  
          res.render('regist.ejs', { errors: errors }); 
        } else {
          next();
        }
      }
    );
  },
  (req, res) => {
    const username = req.body.regist_username;
    const password = req.body.regist_password;
    const errors = [];
    bcrypt.hash(password, 10, (error, hash) => {
      connection.query(
        'insert into users (name, password) values (?, ?)',
        [username, hash],
        (error, results) => {
          if(error) {
            errors.push('エラーが発生しました');
            res.render('regist.ejs', { errors: errors }); 
          } else {
            req.session.userId = results.insertId;
            req.session.username = username;
            res.redirect('/regist_done'); 
          }
        }
      );
    })
  }
)

app.get('/regist_done', (req, res) => {
  res.render('regist_done.ejs');
})

app.get('/login', (req, res) => {
  res.render('login.ejs', { errors: [] });
})
app.post('/login', 
  (req, res, next) => {
    console.log('入力値チェック');
    const username = req.body.login_username;
    const password = req.body.login_password;
    const errors = [];
    if (username === '') {
      errors.push('ユーザー名が入力されていません');
    }
    if (password === '') {
      errors.push('パスワードが空です');
    }
    if (errors.length > 0) {
      res.render('login.ejs', { errors: errors });
    } else {
      next();
    }
  },
  (req, res) => {
  const username = req.body.login_username;
  const errors = [];
  connection.query(
    'SELECT * FROM users WHERE name = ?',
    [username],
    (error, results) => {
      if (results.length > 0) {
        const plain_password = req.body.login_password;
        const hash_password = results[0].password;
        bcrypt.compare(plain_password, hash_password, (error, isEqual) => {
          if (isEqual){
            console.log('認証に成功しました');          
            req.session.userid = results[0].userid;
            req.session.username = results[0].name;
            console.log(results);
            res.redirect("/");
          } else {
            console.log('認証に失敗しました');
            errors.push('パスワードが違います');
            res.render('login.ejs', { errors: errors });
          }
        });
      } else {
        errors.push('ユーザーが存在しません');
        res.render('login.ejs', {errors: errors });
      }
    }
  )
});

app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    res.redirect('/');
  });
});

app.get('/mypage', (req, res) => {
  res.render('mypage.ejs');
})

app.get('/change_info', (req, res) => {
  res.render('change_info.ejs', {result_message: []});
})
app.post('/change_info', (req, res) => {
  const username = req.body.change_username;
  const userid = req.session.userid;
  connection.query(
    'UPDATE users SET name = ? WHERE userid = ?',
    [username, userid],
    (error, result) => {
      if(error) {
        console.log('ユーザーネーム変更エラー');
        res.redirect('/change_info'); 
      } else {
        connection.query(
          'SELECT name FROM users WHERE userid = ?',
          [userid],
          (error, result) => {
            let result_message = "ユーザー情報を変更しました";
            console.log(result);
            req.session.username =  result[0].name;
            res.render('change_info.ejs', {result_message: result_message});
          }
        )
      }
    }
  )
})

app.get('/payment_info', (req, res) => {
  res.render('payment_info.ejs');
})

app.get('/payment_info_add', (req, res) => {
  res.render('payment_info_add.ejs');
})

app.get('/payment_info_update', (req, res) => {
  res.render('payment_info_update.ejs');
})

app.get('/vote', (req, res) => {
  res.render('vote.ejs');
})
app.post('/vote', (req, res) => {
  const aaaa = req.body.movie;
  console.log(aaaa);
  res.redirect('/vote'); 
})

app.get('/introduce_movie/:id', (req, res) => {
  movieid = req.params.id;
  connection.query(
    'SELECT * FROM movies WHERE movieid = ?',
    [movieid],
    (errror, result) => {
      console.log(result);
      res.render('introduce_movie.ejs', {movieinfo: result});
    }
  )
})

app.get('/reserve_one', (req, res) => {
  res.render('reserve_one.ejs');
})

app.get('/reserve_two', (req, res) => {
  res.render('reserve_two.ejs');
})
app.post('/reserve_three', (req, res) => {
  res.render('/reserve_three'); 
})

app.get('/reserve_done', (req, res) => {
  res.render('reserve_done.ejs'); 
})

let port = 3002;
console.log(`running ${port}`);
app.listen(port);
