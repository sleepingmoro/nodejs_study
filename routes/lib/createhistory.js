module.exports = function(sender, receiver, amount, type) {
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