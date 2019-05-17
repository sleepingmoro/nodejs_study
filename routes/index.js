var express = require('express');
var router = express.Router();
const models = require('../models');

/* GET home page. */
router.get('/', function(req, res, next) {
    let session = req.session;

    res.render("user/login", {
        session : session,
        msg: ''
    });
});

module.exports = router;
