var swig  = require('swig');
var React = require('react');
var Router = require('react-router');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var async = require('async');
var request = require('request');
var waterline = require('waterline');
var xml2js=require('xml2js');
var _ = require('underscore');

var CharacterClass = require('./models/yide');
var config = require('./config');
var routes = require('./app/routes');

var app = express();
let orm = new waterline();

orm.loadCollection(CharacterClass);
app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/stats', (req,res,next) => {
	let asyncTask = [];
	let countColumn = [
				{},
				{race: 'Amarr'},
				{race: 'Caldari'},
				{race: 'Gallente'},
				{race: 'Minmatar'},
				{gender: 'Male'},
				{gender: 'Female'}
			];
	countColumn.forEach(column => {
		asyncTask.push( callback => {
			app.models.yide.count(column,(err,count) => {
				callback(err,count);
			});
		})
	});

	asyncTask.push(callback =>{
		app.models.yide.find()
							.sum('wins')
							.then(results => {
								callback(null,results[0].wins);
							});
	} );

	asyncTask.push(callback => {
		app.models.yide.find()
							.sort('wins desc')
							.limit(100)
							.select('race')
							.exec((err,characters) => {
								if(err) return next(err);

								let raceCount = _.countBy(characters,character => character.race);
								console.log(raceCount);
								let max = _.max(_.values(raceCount));
								console.log(max);
								let inverted = _.invert(raceCount);
								let topRace = inverted[max];
								let topCount = raceCount[topRace];

								

								callback(err,{race: topRace, count: topCount});
							});
	});

	asyncTask.push(callback => {
		app.models.yide.find()
							.sort('wins desc')
							.limit(100)
							.select('bloodline')
							.exec((err,characters) => {
								if(err) return next(err);

								let bloodlineCount = _.countBy(characters,character => character.bloodline);
								let max = _.max(_.values(bloodlineCount));
								let inverted = _.invert(bloodlineCount);
								let topBloodline = inverted[max];
								let topCount = bloodlineCount[topBloodline];

								callback(err,{bloodline: topBloodline, count: topCount});
							});
	});

	async.parallel(asyncTask,(err,results) => {
		if(err) return next(err);
		res.send({
			totalCount: results[0],
	        amarrCount: results[1],
	        caldariCount: results[2],
	        gallenteCount: results[3],
	        minmatarCount: results[4],
	        maleCount: results[5],
	        femaleCount: results[6],
	        totalVotes: results[7],
	        leadingRace: results[8],
	        leadingBloodline:results[9]
		});
	}) 
});

app.post('/api/report', (req,res,next) => {
	var characterId = req.body.characterId;

	app.models.yide.findOne({characterId: characterId}, (err,character) => {
		if(err) return next(err);

		if(!character) {
			return res.status(404).send({ message: 'Character not found'});
		}

		character.reports++;

		if(character.reports > 4){
			character.remove();
			return res.send({ message: character.name + ' has been deleted.'});
		}

		character.save(err => {
			if(err) return next(err);
			res.send({ message: character.name + ' has been reported.'})
		});

	});
});

/**
 * POST /api/characters
 * Adds new character to the database.
 */
app.post('/api/characters', function(req, res, next) {
  var gender = req.body.gender;
  var characterName = req.body.name;
  
  async.waterfall([
    function(callback) {
		//根据名字判断是否有重复
      app.models.yide.findOne({ name: characterName }, function(err, character) {
              if (err) return next(err);

              if (character) {
                return res.status(409).send({ message: character.name + ' is already in the database.' });
              }

              callback(err);
            });
    },
    function() {
	  let characterId=(new Date()).toLocaleString();
      app.models.yide.create({
							characterId: characterId,
							name: characterName,
							race: '',
							bloodline: '',
							gender: gender
						},(err,model) => {
							if(err) return next(err);
							res.send({ message: characterName + ' has been added successfully!'});
						});
    }
  ]);
});

app.put('/api/characters/', (req, res, next) => {
	let winner = req.body.winner;
	let loser = req.body.loser;

	console.log('winner: ' + winner + '\n');
	console.log('loser: ' + loser +'\n');
	if(!winner || !loser) {
		return res.status(400).send({ message: 'Voting requires two characters.'});
	}

	if(winner === loser) {
		return res.status(400).send({ message: 'Cannot vote for and against the same characters'});
	}

	async.parallel([
		callback => {
			app.models.yide.findOne({ characterId: winner }, (err, winner) => {
				callback(err,winner);
			});
		},
		callback => {
			app.models.yide.findOne({ characterId: loser}, (err, winner) => {
				callback(err,winner);
			});
		}		
	],
	(err, results) => {
		if(err) return next(err);

		let winner = results[0];
		let loser = results[1];

		if(!winner || !loser) {
			return res.status(404).send({ message: 'One of the characters no longer exists.'});
		}

		if(winner.voted || loser.voted){
			return res.status(200).end();
		}

		async.parallel([
			callback => {
				winner.wins++;
				winner.save(err => {
					callback(err);
				});
			},
			callback => {
				loser.losses++;
				loser.save(err => {
					callback(err);
				});
			}
		],err => {
			if(err) return next(err);
			res.status(200).end();
		});
	});
});


app.get('/api/characters', (req,res,next) => {
	
	let choice = ['Female', 'Male'];
	let randomGender = _.sample(choice);
	//原文中是通过nearby字段来实现随机取值，waterline没有实现mysql order by rand(),所以返回所有结果，用lodash来处理
	//简化查询character条件，按性别随机过滤出两个展示
	app.models.yide.find()
		.exec((err,characters) => {
			if(err) return next(err);
			
			//将查询出的角色信息，按性别过滤出两个
			let randomCharacters = _.sample(_.filter(characters,{'gender': randomGender}),2); 
			if(randomCharacters.length === 2){
				return res.send(randomCharacters);
			}

			//换个性别再试试
			let oppsiteGender = _.first(_.without(choice, randomGender));
			let oppsiteCharacters = _.sample(_.filter(characters,{'gender': oppsiteGender}),2); 

			if(oppsiteCharacters === 2) {
				return res.send(oppsiteCharacters);
			}
			//如果两个角色未投票的数量都小于2，给出提示，需要去添加角色
			return res.status(409).send({ message:'need to add chracter.' });
			
		});
});

app.get('/api/characters/shame',(req,res,next) => {
	app.models.yide.find()
						.sort('losses desc')
						.limit(100)
						.exec((err,characters) =>{
							if(err) return next(err);
							res.send(characters);
						});
});

app.get('/api/characters/top',(req,res,next) => {
	var params = req.query;
	console.log(params);
	//next();
	app.models.yide.find(params)
						.sort('wins desc')
						.limit(100)
						.exec((err,characters) => {
							if(err) return next(err);

							characters.sort(function(a, b) {
						    	if (a.wins / (a.wins + a.losses) < b.wins / (b.wins + b.losses)) { return 1; }
						    	if (a.wins / (a.wins + a.losses) > b.wins / (b.wins + b.losses)) { return -1; }
						        return 0;
						      });

							res.send(characters);
						});

});

app.get('/api/characters/search', (req,res,next) => {
	app.models.yide.findOne({name:{'contains':req.query.name}}, (err,character) => {
		if(err) return next(err);

		if(!character) {
			return res.status(404).send({ message: 'Character not found.'});
		}

		return res.send(character);
	});
});

app.get('/api/characters/count', (req,res,next) => {
	app.models.yide.count({},(err, count) => {
		if(err) return next(err);
		res.send({ count: count });
	});
});
app.get('/api/characters/:id', (req,res,next) => {
	var id = req.params.id;

	app.models.yide.findOne({characterId: id}, (err,character) => {
		if(err) return next(err);

		if(!character){
			return res.status(404).send({ message: 'character not found'});
		}

		res.send(character);
	});
});



app.use(function(req, res) {
  Router.run(routes, req.path, function(Handler) {
    var html = React.renderToString(React.createElement(Handler));
    var page = swig.renderFile('views/index.html', { html: html });
    res.send(page);
  });
});

var server = require('http').createServer(app);
var io = require('socket.io')(server);
var onlineUsers = 0;

io.sockets.on('connection', function(socket) {
  onlineUsers++;

  io.sockets.emit('onlineUsers', { onlineUsers: onlineUsers });

  socket.on('disconnect', function() {
    onlineUsers--;
    io.sockets.emit('onlineUsers', { onlineUsers: onlineUsers });
  });
});


orm.initialize(config, (err,models) => {
	if(err) throw err;
	app.models = models.collections;
	//app.set('models',models.collections);
	app.connections = models.connections;

	server.listen(app.get('port'),() => {
		console.log('Express server listening on port ' + app.get('port'));
	});
});