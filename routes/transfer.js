const express = require('express');
const router = express.Router();
const models = require("../models");
const createhistory = require('./lib/createhistory.js');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
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
        models.transferHistory.findAll({
            attributes: ['sentUserEmail', 'receivedUserEmail', 'amount', 'type', 'createdAt'],
            where: {
                [Op.or]: [{sentUserEmail: req.session.email}, {receivedUserEmail: req.session.email}]
            },
            order: [['id', 'DESC']]
        }).then(result => {

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

router.get('/history', function(req, res, next) {
    if(!req.session.email){
        res.redirect("/");
        return;
    }

    var pageNum = req.query.page; // 요청 페이지 넘버
    let offset = 0;
    console.log(pageNum);

    if(pageNum > 1){
        offset = 10 * (pageNum - 1);
    }

    var tab = req.query.tab;
    let session = req.session;
    var c;
    console.log("=====================", tab);

    switch (tab) {
        case 'received':
            console.log('입금내역');
            models.transferHistory.findAll(
                {where: {receivedUserEmail: req.session.email}
                }).then(count =>{
                c = count.length;
            }).then(function() {
                models.transferHistory.findAll({
                    attributes: ['id', 'sentUserEmail', 'receivedUserEmail', 'amount', 'type', 'createdAt'],
                    where: {receivedUserEmail: req.session.email},
                    order: [['id', 'DESC']],
                    offset: offset,
                    limit: 10
                }).then(histories => {
                    console.log(c);
                    res.render("transfer/history", {
                        histories: histories,
                        session: session,
                        user_info: req.session.email,
                        count: c,
                        tab: tab,
                        page: pageNum
                    });
                });
            });
            break;
        case 'sent':
            console.log('출금내역');
            models.transferHistory.findAll(
                {where: {sentUserEmail: req.session.email}
                }).then(count =>{
                c = count.length;
            }).then(function() {
                models.transferHistory.findAll({
                    attributes: ['id', 'sentUserEmail', 'receivedUserEmail', 'amount', 'type', 'createdAt'],
                    where: {sentUserEmail: req.session.email},
                    order: [['id', 'DESC']],
                    offset: offset,
                    limit: 10
                }).then(histories => {
                    res.render("transfer/history", {
                        histories: histories,
                        session: session,
                        user_info: req.session.email,
                        count: c,
                        tab: tab,
                        page: pageNum
                    });
                });
            });
            break;
        case 'test':
            console.log('테스트용 전체내역');
            models.transferHistory.findAll().then(count =>{
                c = count.length;
            }).then(function() {
                models.transferHistory.findAll({
                    attributes: ['id', 'sentUserEmail', 'receivedUserEmail', 'amount', 'type', 'createdAt'],
                    order: [['id', 'DESC']],
                    offset: offset,
                    limit: 10
                }).then(histories => {
                    res.render("transfer/history", {
                        histories: histories,
                        session: session,
                        user_info: req.session.email,
                        count: c,
                        tab: tab,
                        page: pageNum
                    });
                });
            });
            break;
        default:
            console.log('나의 전체내역');
            models.transferHistory.findAll(
                {where: {
                        [Op.or]: [{sentUserEmail: req.session.email}, {receivedUserEmail: req.session.email}]
                    }
                }).then(count =>{
                c = count.length;
            }).then(function() {
                models.transferHistory.findAll({
                    attributes: ['id', 'sentUserEmail', 'receivedUserEmail', 'amount', 'type', 'createdAt'],
                    where: {
                        [Op.or]: [{sentUserEmail: req.session.email}, {receivedUserEmail: req.session.email}]
                    },
                    order: [['id', 'DESC']],
                    offset: offset,
                    limit: 10
                }).then(histories => {
                    res.render("transfer/history", {
                        histories: histories,
                        session: session,
                        user_info: req.session.email,
                        count: c,
                        tab: tab,
                        page: pageNum
                    });
                });
            });
    }

    // });
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
                })
            )});
    });
};


module.exports = router;