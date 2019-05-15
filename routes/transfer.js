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
    let body = req.body;
    console.log(body);

    // models.user.findOne({
    //     where: {email: body.userEmail}
    // }, function(result){
    //     console.log(result);
    //     console.log(result.balance);
    //     // 받는사람의 금액 변경
    //     result.update({
    //         balance: parseInt(result.dataValues.balance) + parseInt(body.amount)
    //     });
    //     // 보내는사람의 금액 변경
    //     models.user.findOne({
    //         where: {email: req.session.email}
    //     }, function(result2){
    //         result2.update({
    //             balance: parseInt(result2.dataValues.balance) - parseInt(body.amount)
    //         });
    //         createhistory(result2.dataValues.email, result.dataValues.email, parseInt(body.amount), 1);
    //     }, function(){
    //         res.redirect("/transfer");
    //     });
    // });


    models.user.findOne({
        where: {email: body.userEmail}
    })
        .then(result => {
            // 받는사람의 금액 변경
            result.update({
                balance: parseInt(result.dataValues.balance) + parseInt(body.amount)
            });
            // 보내는사람의 금액 변경
            models.user.findOne({
                where: {email: req.session.email}
            })
                .then(result2 => {
                    result2.update({
                        balance: parseInt(result2.dataValues.balance) - parseInt(body.amount)
                    });
                    console.log(result2.dataValues.id);
                    console.log(result2.dataValues.email);
                    console.log(result2.dataValues.name);
                    console.log(result2.dataValues.balance);
                    console.log(result.dataValues.email);
                    console.log(result.dataValues.name);
                    console.log(result.dataValues.balance);

                    // 송금 history create
                    createhistory(result2.dataValues.email, result.dataValues.email, parseInt(body.amount), 1);

                });

            // TODO: 송금이 완료된 다음에 redirect 되도록 해야함.
            // 지금 update랑 redirect랑 같은 depth에 있어서 그런것.
            // TODO: 지금은 뷰에서 보이는 잔액이 왔다갔다함. 비동기 떄문인거같음..
            res.redirect("/transfer");
        })
        .catch( err => {
            console.log(err);
        });

});

module.exports = router;
