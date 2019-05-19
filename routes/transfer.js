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
        .then(function (balance) {
            console.log("=======================", balance);
            res.send({
                result: receiver_email+'님께 ' + amount + 'point 송금이 완료되었습니다.',
                new_balance: balance
            });
        }).catch(function(err){
        res.send({result: err.toString()});
    });
});

var transfer = async function(receiver_email, sender_email, amount){
    // 유저를 먼저 찾아둔다.
    var sender = await findUser(sender_email);
    var receiver = await findUser(receiver_email);
    // 상대방이 존재하지 않거나, 잔액 부족시 송금하지 않음
    if(!receiver){
        throw new Error('존재하지 않는 유저입니다.');
    }
    if(sender.balance < amount){
        throw new Error('잔액이 부족합니다.');
    }
    // 금액 가감은 트랜젝션으로 묶어 처리함
    return models.sequelize.transaction().then(function(transaction) {
        t = transaction;
        return receiver.update({
            balance: parseInt(receiver.dataValues.balance) + amount
        }, {
            transaction: t
        }).then(function(){
            return sender.update({
                balance: parseInt(sender.dataValues.balance) - amount
            }, {
                transaction: t
            });
        });
    }).then(function(sender){
        // 송금 처리 성공시 history를 생성하고 커밋함
        createhistory(sender_email, receiver_email, amount, 1);
        t.commit(sender.balance);
        return sender.balance
    }).catch(err => {
        return t.rollback(err);
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