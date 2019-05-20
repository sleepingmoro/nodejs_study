const models = require("../../models");

function findUser(userEmail){
    return models.user.findOne({
        where: {email: userEmail}
    })
}

var transfer = async function(receiver_email, sender_email, amount){
    // 유저를 먼저 찾아둔다.
    var sender = await findUser(sender_email);
    var receiver = await findUser(receiver_email);
    // 상대방이 존재하지 않거나, 잔액 부족시 송금하지 않음
    if(!receiver){
        throw new Error('존재하지 않는 유저입니다.');
    }
    if(sender_email === receiver_email){
        throw new Error('자신에게는 송금할 수 없습니다.');
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
        createHistory(sender_email, receiver_email, amount, 1);
        t.commit(sender.balance);
        return sender.balance
    }).catch(err => {
        return t.rollback(err);
    });
};

function createHistory(sender, receiver, amount, type) {
    const models = require("../../models");

    return models.transferHistory.create({
        sentUserEmail: sender,
        receivedUserEmail: receiver,
        amount: amount,
        type: type
    }).then( result =>{
        return result;
    }).catch( err => {
        throw new Error(err);
    });
};

function findHistories(condition, offset){
    return models.transferHistory.findAll({
        attributes: ['id', 'sentUserEmail', 'receivedUserEmail', 'amount', 'type', 'createdAt'],
        where: condition,
        order: [['id', 'DESC']],
        offset: offset,
        limit: 10
    })
};

module.exports.findUser = findUser;
module.exports.transfer = transfer;
module.exports.createHistory = createHistory;
module.exports.findHistories = findHistories;
