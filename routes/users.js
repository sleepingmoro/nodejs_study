const express = require('express');
const router = express.Router();
const models = require("../models");
const crypto = require("crypto");
const createhistory = require('./lib/createhistory.js');

router.get('/sign_up', function(req, res, next) {
  res.render("user/signup");
});

// TODO: promise 문법에서 넘겨준 변수명들 정리
// TODO: console.log 제거
// TODO: 이메일 중복일 때 알럿
router.post("/sign_up", function(req,res,next){
  let body = req.body;

  let inputPassword = body.password;
  let salt = Math.round((new Date().valueOf() * Math.random())) + "";
  let hashPassword = crypto.createHash("sha512").update(inputPassword + salt).digest("hex");

  // 새 유저 생성
  models.user.create({
    name: body.userName,
    email: body.userEmail,
    password: hashPassword,
    balance: 500,
    salt: salt,
    recommendedUserEmail: body.recommendUserEmail !== '' ? body.recommendUserEmail : null
  })
      .then( new_user => {
          // 가입축하 포인트 history create
          createhistory('admin', new_user.email, 500, 2);

          // 추천인 입력한 경우 추천인에게 포인트 지급
          if(new_user.recommendedUserEmail){
              console.log("추천인 있음!!!!!!!!!!!!!!!!!!");
              models.user.findOne({
                  where: {email: new_user.recommendedUserEmail}
              })
                  .then( recommended_user => {
                      recommended_user.update({balance: parseInt(recommended_user.balance) + 500 });
                      // 추천인 포인트 history create
                      createhistory(new_user.email, recommended_user.email, 500, 3);
                  })
                  .catch()
          }

          res.redirect("/users/login");
      })
      .catch( err => {
        console.log(err)
      })
});

// 추천인 찾기
router.post('/find_recommended_user', function(req, res, next){
    console.log('get ajax call');
    var recommendedUserEmail = req.body.recommended_user_email;
    console.log('input',recommendedUserEmail);
    models.user.findOne({
        where: {email : recommendedUserEmail}
    })
        .then(user => {
            if(!user){
                console.log('user', 'no user');
                res.send({user: null});
                return;
            }
            console.log('user', user.dataValues.email);
            res.send({user: user});
        })
        .catch( err =>{
            console.log(err);
        });
});

router.get('/', function(req, res, next) {
  if(req.cookies){
    console.log(req.cookies);
  }
  res.send('환영합니다~');
});

// TODO: 다른 페이지에서도 로그인 여부 관리
router.get('/login', function(req, res, next) {
    let session = req.session;

    res.render("user/login", {
        session : session
    });
});

// TODO: 잘못된 로그인 정보일때 핸들링
router.post("/login", function(req,res,next){
  let body = req.body;

  models.user.findOne({
    where: {email : body.userEmail}
  })
      .then( result => {
        let dbPassword = result.dataValues.password;

        let inputPassword = body.password;
        let salt = result.dataValues.salt;
        let hashPassword = crypto.createHash("sha512").update(inputPassword + salt).digest("hex");

        if(dbPassword === hashPassword){
          console.log("비밀번호 일치");

          // 쿠키 설정
          res.cookie("user", body.userEmail, {
            expires: new Date(Date.now() + 900000),
            httpOnly: true
          });

          // 세션 설정
          req.session.email = body.userEmail;

          res.redirect("/transfer");
        }
        else{
          console.log("비밀번호 불일치");
          res.redirect("/users/login");
        }
      })
      .catch( err => {
        console.log(err);
      });
});

router.get("/logout", function(req,res,next){
    req.session.destroy();
    res.clearCookie('sid');

    res.redirect("/users/login")
});

module.exports = router;



