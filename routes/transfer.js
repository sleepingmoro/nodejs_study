const express = require('express');
const router = express.Router();
const models = require("../models");
const createhistory = require('./lib/createhistory.js');

router.get('/', function(req, res, next) {
    if(!req.session.email){
        res.redirect("/");
        return;
    }

    let session = req.session;

    models.user.findOne({
        where: {email: req.session.email}
        }
    ).then(user_info => {
        models.transferHistory.findAll(
            {order: [
                    ['id', 'DESC']
                ]}
        ).then(result => {

            res.render("transfer/index", {
                histories: result,
                session: session,
                user_info: user_info
            });

            // console.log("date",result[0].createdAt);
            // console.log("date", result[0].createdAt instanceof Date);
            // console.log("date", result[0].createdAt.getMonth());

        });
    }).catch();

});

// test용 API
router.post('/send_point', function(req, res, next) {
    let body = req.body;

    models.user.findOne({
        where: {email: body.email}
    })
        .then(result => {
            // 받는사람의 금액 변경
            let new_balance = parseInt(result.dataValues.balance) + parseInt(body.amount);
            result.update({
                balance: new_balance
            });
            // 송금 history create
            // createhistory('admin', body.email, parseInt(body.amount), 4)
            models.transferHistory.create({
                sentUserEmail: 'admin',
                receivedUserEmail: body.email,
                amount: parseInt(body.amount),
                type: 4
            })
                .then( result2 =>
                    res.send({
                        result: {
                            status: 'success',
                            receivedUserEmail: result.dataValues.email,
                            amount: body.amount,
                            balance: new_balance,
                            createdAt: result.dataValues.createdAt
                        }
                    })
                )
                .catch( err => {
                    res.send({
                        result: err
                    })
                });
        })
        .catch( err => {
            console.log(err);
        });

});

// TODO: 중첩된 메서드 해결...
// TODO: 송금 관련 라우트 및 페이지 따로 빼기
// TODO: Transaction 걸기, 실패시 롤백
router.post("/pay", function(req, res, next){
    let receiver_email = req.body.userEmail;
    let sender_email = req.session.email;
    let amount = req.body.amount;

    var sender = function (email) {
        return new Promise(function(resolve, reject) {
            // 보내는사람의 금액 변경
            console.log("sender1");
            models.user.findOne({
                where: {email: req.session.email}
            }).then(send_user => {
                send_user.update({
                    balance: parseInt(send_user.dataValues.balance) - parseInt(amount)
                });
                console.log("sender2");
                resolve(send_user.email);
            });
        });
    };

    var receiver = function (email) {
        return new Promise(function(resolve, rejext) {
            console.log("r1");

            models.user.findOne({
                where: {email: body.userEmail}
            }).then(receive_user => {
                receive_user.update({
                    balance: parseInt(receive_user.dataValues.balance) + parseInt(amount)
                });
                console.log("r2");
                resolve(receive_user.email);
            });
        });
    };

    Promise.all([sender(sender_email), receiver(receiver_email)])
        .then(function (result) {
        console.log("result0, sender", result[0]);
        console.log("result1, receiver", result[1]);
        createhistory(result[1], result[0], parseInt(body.amount), 1);
        })
        .then(function(){
            console.log("redirect");
            res.redirect("/transfer");
        });
});

module.exports = router;