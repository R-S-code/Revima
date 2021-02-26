const express = require('express');
const mysql = require('mysql');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');

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

// トップ
app.get('/', (req, res) => {
  if(res.locals.isLoggedIn === false) {
    res.render('nologin_home.ejs');
  } else {
    var votes_result = null;
    connection.query(
      'SELECT * FROM votes WHERE userid = ?',
      [req.session.userid],
      (error, result)=> {
        if(result.length > 0) {
          votes_result = result;
        } else {
          votes_result = [];
        }
      }
    )
    var payment_result = null;
    connection.query(
      'SELECT * FROM payment WHERE userid = ?',
      [req.session.userid],
      (error, result)=> {
        if(result.length > 0) {
          req.session.payment = result
          payment_result = result;
          res.render('home.ejs', {your_vote: votes_result, your_payment: payment_result});
        } else {
          payment_result = [];
          res.render('home.ejs', {your_vote: votes_result, your_payment: payment_result});
        }
      }
    )
  }
})

// 登録処理
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
            req.session.userid = results.userid;
            req.session.username = username;
            res.redirect('/regist_done'); 
          }
        }
      );
    })
  }
)

// 登録完了
app.get('/regist_done', (req, res) => {
  res.render('regist_done.ejs');
})

// ログイン
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

// ログアウト
app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    res.redirect('/');
  });
});

// マイページ処理
app.get('/mypage', (req, res) => {
  res.render('mypage.ejs');
})
app.get('/change_info', (req, res) => {
  res.render('change_info.ejs', {result_message: []});
})

const storage = multer.diskStorage({
  destination: (req, file, cb)=> {
    // 保存先
    cb(null, './public/usericon')
  },
  filename: (req, file, cb)=> {
    // 保存するファイルの名前
    const userid = req.session.userid;
    cb(null, `${userid}.jpg`)
  }
})

const upload = multer({storage: storage});

app.post('/change_info',  upload.single('file'), (req, res) => {
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
app.get('/reserve_list', (req, res) => {
  const userid = req.session.userid;
  connection.query(
    'SELECT * FROM play JOIN reserve ON play.playid = reserve.playid JOIN movies ON play.movieid = movies.movieid WHERE reserve.userid = ?',
    [userid],
    (error, results)=> {
      if(error) {
        console.log()
        console.log(error);
      } else {
        console.log(results);
        res.render('reserve_list.ejs',{reserved_info: results});
      }
    }
  )
})
app.get('/reserve_detail/:id', (req, res) => {
  reservedid = req.params.id;
  connection.query(
    'SELECT * FROM reserve JOIN seats on reserve.seat = seats.seat JOIN screens on seats.screen = screens.screen JOIN play ON reserve.playid = play.playid JOIN movies ON play.movieid = movies.movieid  WHERE reserveid = ? AND screens.screen = play.screen',
    [reservedid],
    (error ,results)=> {
      if(error) {
        console.log("予約詳細エラー");
        console.log(error);
      } else {
        console.log(results);
        res.render('reserve_detail.ejs', {detail_info: results});
      }
    } 
  )
})
app.get('/reserve_detail_delete/:id', (req, res) => {
  reserveid = req.params.id;
  connection.query(
    'delete from reserve where reserveid = ?',
    [reserveid],
    (error, result)=> {
      if(error) {
        console.log("クレジットカード削除エラー");
        res.redirect("/reserve_list");
      } else {
        console.log(result);
        res.redirect("/reserve_list");
      }
    }
  )
})

// 支払い情報
app.get('/payment_info', (req, res) => {
  const userid = req.session.userid;
  connection.query(
    'SELECT * FROM payment WHERE userid = ?',
    [userid],
    (error, results) => {
      if (error) {
        console.log("エラー")
        console.log(error);
        res.redirect('/mypage');
      } else {
        console.log(results);
        res.render('payment_info.ejs', {creditcards: results});
      }
    }
  );
})

app.get('/payment_info_add', (req, res) => {
  res.render('payment_info_add.ejs');
})
app.post('/payment_info_add', (req, res) => {
  const yourname = req.body.yourname;
  const expiration = req.body.expiration;
  const cvv = req.body.cvv;
  const creditnums = req.body.creditnum;
  let your_creditnumber = "";
  creditnums.forEach((creditnum) => {
    your_creditnumber += creditnum;
  });

  connection.query(
    "INSERT INTO payment (userid, creditnumber, name, expiration, cvv) values (?, ?, ?, ?, ?)",
    [req.session.userid, your_creditnumber, yourname, expiration, cvv],
    (error, result) => {
      if(error) {
        console.log("クレジットカード追加エラー");
        console.log(error);
        res.redirect('/payment_info'); 
      } else {
        console.log("クレジットカード追加が成功しました。");
        console.log(result);
        res.redirect('/payment_info'); 
      }
    }
  );
})

app.get('/payment_info_update/:id', (req, res) => {
  paymentid = req.params.id;
  connection.query(
    'select * from payment where paymentid = ?',
    [paymentid],
    (error, result)=> {
      if(error) {
        console.log("クレジットカード編集画面表示エラー");
        res.redirect("/payment_info");
      } else {
        console.log(result);
        res.render("payment_info_update.ejs", {creditinfo: result});
      }
    }
  )
})
app.post('/payment_info_update/:id', (req, res) => {
  const creditnums = req.body.creditnum;
  let your_creditnumber = "";
  creditnums.forEach((creditnum) => {
    your_creditnumber += creditnum;
  });
  const yourname = req.body.yourname;
  const expiration = req.body.expiration;
  const cvv = req.body.cvv;
  paymentid = req.params.id;

  connection.query(
    'UPDATE payment SET creditnumber = ?, name = ?, expiration = ?, cvv = ? WHERE paymentid = ?',
    [your_creditnumber, yourname, expiration, cvv, paymentid],
    (error, result)=> {
      if(error) {
        console.log("クレジットカード編集処理エラー");
        console.log(error); 
      } else {
        console.log(result);
        res.redirect("/payment_info");
      }
    }
  )
})
app.get('/payment_info_delete/:id', (req, res) => {
  paymentid = req.params.id;
  connection.query(
    'delete from payment where paymentid = ?',
    [paymentid],
    (error, result)=> {
      if(error) {
        console.log("クレジットカード削除エラー");
        res.redirect("/payment_info");
      } else {
        console.log(result);
        res.redirect("/payment_info");
      }
    }
  )
})

// 投票処理
app.get('/vote', (req, res) => {
  res.render('vote.ejs');
})
app.post('/vote', (req, res) => {
  const selected_movies = req.body.movie;
  connection.query(
    'select max(electionid) from elections',
    (error1, result1)=> {
      let bind_holder = "";
      let values_holder = [];
      election_id = JSON.stringify(result1[0]["max(electionid)"]);
      selected_movies.forEach((selected_movie)=> {
        bind_holder += "(?, ?, ?),";
        values_holder.push(election_id, req.session.userid, selected_movie);
      })
      bind_holder = bind_holder.slice(0, -1);
      console.log(values_holder);
      connection.query(
        `INSERT INTO votes (electionid, userid, movieid) values ${bind_holder}`,
        values_holder,
        (error2, result2) => {
          if(error2) {
            console.log("投票エラー");
            console.log(error2);
          } else {
            res.redirect('/'); 
          }
        }
      )
    }
  )
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

// 予約処理
// 1
app.get('/reserve_one', (req, res) => {
  req.session.playid = 1;
  res.render('reserve_one.ejs');
})
// 2
app.get("/reserve_two", (req, res) => {
	playid = req.session.playid;
	connection.query(
		"select seat from reserve where playid = ?",
		[playid],
		(error, results) => {
      if(error) {
        console.log("座席情報取得エラー");
        console.log(error);
      } else {
        console.log(results);
        res.render("reserve_two.ejs", { reserved_seats: results });
      }
		}
	);
});
// 3
app.get("/reserve_three", (req,res)=> {
  let selected_seats = req.query.seat;
  console.log(JSON.stringify(selected_seats));
  const userid = req.session.userid;
  connection.query(
    'SELECT * FROM payment WHERE userid = ?',
    [userid],
    (error1, results1) => {
      if (error1) {
        console.log("エラー")
        console.log(error);
        res.redirect('/');
      } else {
        console.log(results1);
        const playid = req.session.playid;
        connection.query(
          'SELECT title, start, charge FROM play JOIN movies on play.movieid = movies.movieid WHERE playid = ?',
          [playid],
          (error2, results2) => {
            if(error2){
              console.log("エラー")
              res.redirect('/');
            } else {
              res.render('reserve_three.ejs', {
                selected_seats: selected_seats,
                playid: playid,
                creditcards: results1,
                reserve_info: results2
              })
            }
          }
        )
      }
    }
  );
})
app.post("/reserve_three",(req,res)=> {
  const userid = req.session.userid;
  const playid = req.session.playid;
  const reserved_seats = req.body.seat;
  var bind_holder = "";
  var values_holder = [];
  if(Array.isArray(reserved_seats) == false) {
    bind_holder += "(?, ?, ?)";
    values_holder.push(playid, userid, Number(reserved_seats));
  } else {
    reserved_seats.forEach((reserved_seat)=> {
      bind_holder += "(?, ?, ?),";
      values_holder.push(playid, userid, Number(reserved_seat));
    })
    bind_holder = bind_holder.slice(0, -1);
  }
  connection.query(
    `INSERT INTO reserve (playid, userid, seat) VALUES ${bind_holder}`,
    values_holder,
    (error,result)=> {
      if(error) {
        console.log("予約エラー");
        console.log(error);
      } else {
        console.log(result);
        res.redirect(`/reserve_done/${playid}`);
      }
    }
  )
})
// 4
app.get('/reserve_done/:id', (req, res) => {
  const playid = req.params.id;
  connection.query(
    'SELECT * FROM play JOIN movies ON play.movieid = movies.movieid WHERE playid = ?',
    [playid],
    (error, result)=> {
      if(error) {
        console.log("予約完了エラー");
        console.log(error);
      } else {
        console.log(result);
        res.render('reserve_done.ejs', {info: result}); 
      }
    }
  )
 
})

// 投票結果
app.get('/result', (req, res) => {
  connection.query(
    "SELECT MAX(electionid) FROM elections",
    (error1, result1)=> {
      if(error1) {
        console.log("選挙番号取得エラー");
        console.log(error1);
        res.redirect('/');
      } else {
        console.log("選挙番号取得");
        console.log(result1);
        // 選挙番号取得後、上位映画取得
        let send_electionNum = result1[0]["MAX(electionid)"] - 1; 
        console.log("送る番号は" + send_electionNum);
        connection.query(
          "SELECT count(electionid) as sumvotes, votes.movieid, title FROM votes JOIN movies ON votes.movieid = movies.movieid WHERE electionid = ? GROUP BY movieid ORDER BY sumvotes DESC LIMIT 3",
          [send_electionNum],
          (error2, result)=>{
            if(error2) {
              console.log("投票結果取得エラー");
              console.log(error2);
              res.redirect('/');
            } else {
              console.log("投票結果取得");
              console.log(result);
              res.render('result.ejs', { 
                movies: result,
                electionNum: send_electionNum
              })
            }
          }
        )
      }
    }
  )
})

// 管理者簡易画面
app.get('/admin', (req, res) => {
  res.render('admin.ejs'); 
})

let port = 3300;
console.log(`running ${port}`);
app.listen(port);
