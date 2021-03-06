var router = require('express').Router();
const sqlite3 = require('sqlite3').verbose();
var bcrypt = require('bcryptjs');

var db = new sqlite3.Database('db/database.db', (err) => {
	if (err) {
		console.error(err.message);
	}
	console.log('Connected to the database.');
});

// CREATE USER
router.post('/ftd/api/users/', function (req, res) {
	var userName = req.body.name;
	var userPass = req.body.password;
	var userEmail = req.body.email;

	// Missing parameters
	if (!userPass || !userName || !userEmail) {
		res.status(400);
		var result = {};
		result["error"] = "Please Include a name, password and email";
		res.json(result);
		return;
	}

	console.log("POST:" + userName);

	// HASH HERE
	bcrypt.hash(userPass, 10, function (err, hash) {
		let sql = 'INSERT INTO user(userName, userEmail, userPass) VALUES (?,?,?);';
		db.run(sql, [userName, userEmail, hash], function (err) {
			var result = {};
			if (err) {
				if (err.message == "SQLITE_CONSTRAINT: UNIQUE constraint failed: user.userName") {
					res.status(409);
					result["error"] = "Username already exists";
				}
				else {
					res.status(400);
					result["error"] = err.message;
				}
			}
			else {
				result[userName] = "User was created";
			}
			console.log(JSON.stringify(result));
			res.json(result);
		});
	});
});

// Read user
router.get('/ftd/api/user/:userName/', function (req, res) {
	var userName = req.params.userName;
	console.log("GET: " + userName);

	let sql = 'SELECT * FROM user WHERE userName=?';
	db.get(sql, [userName], (err, row) => {
		var result = {};
		if (err) {
			res.status(400);
			result["error"] = err.message;
		} else {
			if (typeof row == 'undefined') {
				result["error"] = "User does not exist";
				res.status(404);
			}
			else {
				result["Name"] = row["userName"];
				result["Email"] = row["userEmail"];
				result["numKills"] = row["numKills"];
				result["numDeaths"] = row["numDeaths"];
			}
		}
		res.json(result);
	});
});

// Update user
router.put('/ftd/api/user/:username', function (req, res) {
	var oldName = req.params.username;
	var userName = req.body.name;
	var userPass = req.body.password;
	var userEmail = req.body.email;

	// Missing parameters
	if (!userPass || !userName || !userEmail) {
		res.status(400);
		var result = {};
		result["error"] = "Please Include a name, password and email";
		res.json(result);
		return;
	}

	// Hash here
	console.log("PUT:" + userName);

	bcrypt.hash(userPass, 10, function (err, hash) {
		let sql = "UPDATE user SET userPass=?, userEmail=?, userName=? WHERE userName=?;";
		db.run(sql, [hash, userEmail, userName, oldName], function (err) {
			var result = {};
			if (err) {
				if (err.message == "SQLITE_CONSTRAINT: UNIQUE constraint failed: user.userName") {
					res.status(409);
					result["error"] = "Username already exists";
				}
				else {
					res.status(400);
					result["error"] = err.message;
				}
			} else {
				if (this.changes != 1) {
					result["error"] = "No changes were made";
					res.status(404);
				} else {
					result[userName] = "updated rows: " + this.changes;
				}
			}
			res.json(result);
		});
	});
});

// Delete user
router.delete('/ftd/api/users/', function (req, res) {
	var userName = req.body.name;
	console.log("DELETE:" + userName);

	let sql = 'DELETE FROM user WHERE userName=?;';
	db.run(sql, [userName], function (err) {
		var result = {};
		if (err) {
			res.status(400);
			result["error"] = err.message;
		} else {
			if (this.changes != 1) {
				result["error"] = "User does not exist";
				res.status(404);
			}
			else {
				result[userName] = "Deleted User";
			}
		}
		console.log(JSON.stringify(result));
		res.json(result);
	});
});

// Login user
router.post('/ftd/api/login/:userName/', function (req, res) {
	var userName = req.params.userName;
	var userPass = req.body.userPass;
	var loggedIn = false;

	console.log("POST: Login " + userName);

	let sql = "SELECT userPass FROM user WHERE userName=?";
	db.get(sql, [userName], function (err, row) {
		var result = {};
		if (err) {
			res.status(404);
			result["error"] = err.message;
			res.json(result);
		}
		else {
			// User does not exist
			if (typeof row == 'undefined') {
				result["error"] = "Invalid User";
				res.status(404);
				res.json(result);
			}
			// User Exists
			else {
				bcrypt.compare(userPass, row.userPass, function (err, res2) {
					// Password matches
					if (res2) {
						loggedIn = "true";
						result["loggedIn"] = "Logged In";
					}
					// Password doesnt match
					else {
						loggedIn = "false";
						result["error"] = "Incorrect Password"
					}
					res.json(result);
				});
			}
		}
	});
});

// Add 1 to stat numKills
router.put('/ftd/api/kills/:userName/', function (req, res) {
	var userName = req.params.userName;
	var kills = req.body.kills
	console.log("POST:" + userName + "numKills");

	let sql = "UPDATE user SET 'numKills'=numKills+? WHERE userName=?;";
	db.run(sql, [kills, userName], function (err) {
		var result = {};
		if (err) {
			res.status(400);
			result["error"] = err.message;
		} else {
			if (this.changes != 1) {
				result["error"] = "User does not exist";
				res.status(404);
			} else {
				result[userName] = "Updated stats";
			}
		}
		res.json(result);
	});
});

// Add 1 to stat numDeaths
router.put('/ftd/api/deaths/:userName/', function (req, res) {
	var userName = req.params.userName;
	console.log("POST:" + userName + "numDeaths");

	let sql = "UPDATE user SET 'numDeaths'=numDeaths+1 WHERE userName=?;";
	db.run(sql, [userName], function (err) {
		var result = {};
		if (err) {
			res.status(400);
			result["error"] = err.message;
		} else {
			if (this.changes != 1) {
				result["error"] = "User Does not exist";
				res.status(404);
			} else {
				result[userName] = "Updated stats";
			}
		}
		res.json(result);
	});
});

// Get top winners 
router.get('/ftd/api/leaderboard/', function (req, res) {
	let sql = 'SELECT userName, numKills FROM USER ORDER BY numKills DESC LIMIT 10;';
	db.all(sql, [], (err, rows) => {
		var result = {};
		result["leaders"] = [];
		if (err) {
			result["error"] = err.message;
			res.status(400);
		} else {
			rows.forEach((row) => {
				result["leaders"].push(row);
			});
		}
		res.json(result);
	});
});

module.exports = router