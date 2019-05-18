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

    findUser(req.session.email).then(user_info => {
        models.transferHistory.findAll({
            attributes: ['sentUserEmail', 'receivedUserEmail', 'amount', 'type', 'createdAt'],
            where: {
                [Op.or]: [{sentUserEmail: req.session.email}, {receivedUserEmail: req.session.email}]
            },
            order: [['id', 'DESC']]
        }).then(result => {

            res.render("transfer/index", {
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

    if(pageNum > 1){
        offset = 10 * (pageNum - 1);
    }

    var tab = req.query.tab;
    let session = req.session;
    console.log("=====================", tab);

    var condition;
    switch(tab) {
        case 'sent':
            condition = {sentUserEmail: req.session.email};
            break;
        case 'received':
            condition = {receivedUserEmail: req.session.email};
            break;
        case 'test':
            condition = '';
            break;
        default:
            condition = {
                [Op.or]: [{sentUserEmail: req.session.email}, {receivedUserEmail: req.session.email}]
            };
            break;
    }

    let count;
    async function getData(){
        count = await countDatas(condition);
        return findHistories(condition, offset);
    }
    getData().then(histories => {
        res.render("transfer/history", {
            histories: histories,
            session: session,
            user_info: req.session.email,
            count: count,
            tab: tab,
            page: pageNum
        });
    });

});


// test용 API
router.post('/send_point', function(req, res, next) {
    let body = req.body;
    let amount = parseInt(req.body.amount);
    var repeat = body.repeat;

    function updateBalance(user, repeat){
        if(repeat === undefined){
            repeat = 1;
        }
        for(var i = 0;i<repeat;i++){
            var history = models.transferHistory.create({
                sentUserEmail: 'admin',
                receivedUserEmail: body.email,
                amount: amount,
                type: 4
            });
        }
        user.update({
            balance: parseInt(user.balance) + amount*repeat
        });
        return user;
    }
    async function sendPoint(){
        if((amount !== 0) && !isNaN(amount)){
            console.log('amount',!isNaN(amount));
            let user = await findUser(body.email);
            let updatedUser = await updateBalance(user, repeat);
            return {user, updatedUser}
        } else {
            throw new Error('금액을 올바르게 입력하세요.');
        }
    }
    sendPoint().then( result => {
        res.send({
            result: {
                status: 'success',
                receivedUserEmail: result['user'].email,
                amount: amount,
                balance: result['updatedUser'].balance
            }
        })
    }).catch(err => {
        res.send({
            result: {
                status: 'error',
                msg: err.toString()
            }
        })
    });
});

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
            res.send({result: receiver_email+'님께 ' + amount + 'point 송금이 완료되었습니다.'});
        }).catch(function(err){
        msg = err;
        console.log(msg);
        res.send({result: msg});
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

var findHistories = function(condition, offset){
    return models.transferHistory.findAll({
            attributes: ['id', 'sentUserEmail', 'receivedUserEmail', 'amount', 'type', 'createdAt'],
            where: condition,
            order: [['id', 'DESC']],
            offset: offset,
            limit: 10
        })
};

function findUser(userEmail){
    return models.user.findOne({
        where: {email: userEmail}
    })
}

var countDatas = function(condition){
    return models.transferHistory.count({where: condition})
};

module.exports = router;