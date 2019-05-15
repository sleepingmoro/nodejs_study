const express = require('express');
const router = express.Router();
const models = require("../models");
const createhistory = require('./lib/createhistory.js');
var msg = '';

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
                user_info: user_info,
                msg: msg
            });
            msg = '';
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

// TODO: 송금 관련 라우트 및 페이지 따로 빼기
// TODO: 중복되는 부분 모듈화하기
// TODO: 불필요하게 가져오는 컬럼 제거
router.post("/pay", function(req, res, next){
    let receiver_email = req.body.userEmail;
    let sender_email = req.session.email;
    let amount = parseInt(req.body.amount);

    if(!sender_email){
        res.redirect("/");
        return;
    }

    transfer(receiver_email, sender_email, amount)
        .then(function () {
            createhistory(sender_email, receiver_email, amount, 1);
        }).then(function(){
            console.log("redirect");
            res.redirect("/transfer");
        }).catch(function(err){
            console.log("err 메시지"+err);
            msg = err;
            console.log(msg);
            res.redirect("/transfer");
        });
});

var transfer = function (receiver_email, sender_email, amount) {
    return new Promise(function(resolve, reject) {

        // 트랜젝션
        models.sequelize.transaction().then(function(transaction){
            t = transaction;

            // 보내는사람의 금액 변경
            models.user.findOne({
                where: {email: sender_email},
                transaction: t
            }).then(send_user => {
                if(send_user.balance > amount) {
                    return send_user.update({
                        balance: parseInt(send_user.dataValues.balance) - amount
                    }, {
                        transaction: t
                    });
                } else {
                    reject('잔액 부족');
                    return t.rollback();
                    // throw new Error('not enough balance!');
                }
            }).then(
                // 받는 사람의 금액 변경
                models.user.findOne({
                    where: {email: receiver_email},
                    transaction: t
                }).then(receive_user => {
                    if(receive_user){
                        return receive_user.update({
                            balance: parseInt(receive_user.dataValues.balance) + amount
                        },{
                            transaction: t
                        });
                    } else {
                        reject('존재하지 않는 유저입니다.');
                        throw new Error('no user');
                    }

                }).then(function(){
                    resolve(receiver_email, t);
                    return t.commit();
                }).catch(function (err) {
                    reject('문제가 발생하였습니다. 잠시 후 다시 시도해주세요.');
                    if (t) {
                        t.rollback();
                    }
                })
            )});
    });
};


module.exports = router;