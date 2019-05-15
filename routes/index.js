var express = require('express');
var router = express.Router();
const models = require('../models');

/* GET home page. */
router.get('/', function(req, res, next) {
    let session = req.session;
    res.render('index', { title: 'Express', session : session });
    // session O
      // 로그인 폼 / 회원가입 링크

    // session X
        // 회원가입 페이지 리다이렉트

});

router.get('/show', function(req, res, next) {
    models.post.findAll().then( result => {
        var loopIndex = 0;

        for(let post of result){
            models.post.findAll({
                include: {model: models.reply, where: {postId: post.id}}
            }).then( result2 => {
                if(result2){
                    post.replies = result2.replies
                }

                loopIndex++;
                if( loopIndex === result.length){
                    res.render("show", {
                        posts : result
                    });
                }
            });
        }
    });
});

router.post('/create', function(req, res, next) {
    let body = req.body;

    models.post.create({
        title: body.inputTitle,
        writer: body.inputWriter
    })
        .then( result => {
            console.log("데이터 추가 완료");
            res.redirect("/show");
        })
        .catch( err => {
            console.log("데이터 추가 실패");
        })
});

router.get('/edit/:id', function(req, res, next) {
    let postID = req.params.id;

    models.post.findOne({
        where: {id: postID}
    })
        .then( result => {
            res.render("edit", {
                post: result
            });
        })
        .catch( err => {
            console.log("데이터 조회 실패");
        });
});

router.put('/update/:id', function(req, res, next) {
    let  postID = req.params.id;
    let body = req.body;

    models.post.update({
        title: body.editTitle,
        writer: body.editWriter
    },{
        where: {id: postID}
    })
        .then( result => {
            console.log("데이터 수정 완료");
            res.redirect("/show");
        })
        .catch( err => {
            console.log("데이터 수정 실패");
        });
});

router.delete('/delete/:id', function(req, res, next) {
    let postID = req.params.id;

    models.post.destroy({
        where: {id: postID}
    })
        .then( result => {
            res.redirect("/show")
        })
        .catch( err => {
            console.log("데이터 삭제 실패");
        });
});


router.post("/reply/:postID", function(req, res, next){
    let postID = req.params.postID;
    let body = req.body;

    models.reply.create({
        postId: postID,
        writer: body.replyWriter,
        content: body.replyContent
    })
        .then( results => {
            res.redirect("/show");
        })
        .catch( err => {
            console.log(err);
        });
});

// TODO: test 코드 삭제
router.post('/test', function(){
    function add(a, b, callback){
        var result = a+b;
        callback(result);

        var history = function(){
            return '결과값 : ' + result
        }

        return history
    }

    var multi_history = add(10, 3, function(result){
        console.log(result);
    })
    console.log(multi_history());
});

module.exports = router;
