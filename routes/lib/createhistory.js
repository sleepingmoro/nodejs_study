module.exports = function(sender, receiver, amount, type) {
    const models = require("../../models");

    models.transferHistory.create({
        sentUserEmail: sender,
        receivedUserEmail: receiver,
        amount: amount,
        type: type
    })
        .then()
        .catch( err => {
            console.log(err);
        });
};