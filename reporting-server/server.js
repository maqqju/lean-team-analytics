const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const Promise = require("es6-promise").Promise;
const http = require("https");



/**
 * Encodes a string to Base 64
 * @param  {String} string - String to encode
 * @return {String}        - Encoded input string to Base 64
 */
function btoa(string) {
	return new Buffer(string).toString("base64");
}

function getHistoricalData(CONFIG, insertData, cb) {

	function getData(page) {
		console.log("Getting data for page "+ (page ? page : 0));
		var startAt = 0;
		if (page) {
			startAt = (page * 50) + 1;
		}

		var options = {
			method : "GET",
			hostname : CONFIG.jiraUrl,
			path : CONFIG.endpoints.search + "?jql=" + encodeURIComponent(CONFIG.jql.history)+"&fields=status,customfield_"+CONFIG.fields.storyPoints+",timespent&expand=changelog",
			headers : { 
				"Authorization" : "Basic "+btoa(CONFIG.username+":"+CONFIG.password),
				"Content-Type" : "application/json",
		    	"cache-control": "no-cache"
			}
		}

		options.path += "&startAt="+startAt+"&maxResults=50";

		var dataRequest = http.request(options, (res) => {
			var chunks = [];

			res.on("data", (chunk) => {
				chunks.push(chunk);
			});

			res.on("end", () => {
				var body = JSON.parse(Buffer.concat(chunks));
				insertData && insertData(body.issues);
				if (startAt < body.total) {
					getData(page ? page+1 : 1);
				} else {
					//doThreePointValues();
					cb && cb();
					return;
				}
			});
		});

		dataRequest.on("error", (e) => {
			console.log("Problem with request ", e);
		});

		dataRequest.end();
	}

	getData(0);
	
}

function ReportingServer(CONFIG) {
	let app = express();
	let db = new sqlite3.Database(":memory:");

	process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

	let port = process.env.SERVER_PORT || 6970;

	db.serialize(() => {
		console.log("Creating database schema...");

		db.run("CREATE TABLE tbl_history_stories (key VARCHAR(20), points SMALLINT, timespent BIGINT)");
		db.run("CREATE TABLE tbl_history_cycle (key VARCHAR(20), points SMALLINT, phase VARCHAR(30), timespent DOUBLE)");

		// tpe => three point estimation
		db.run("CREATE TABLE tbl_tpe_stories (points SMALLINT, sd BIGINT, weightedaverage BIGINT)");
		db.run("CREATE TABLE tbl_tpe_cycle (points SMALLINT, phase VARCHAR(30), sd BIGINT, weightedaverage BIGINT)");

		let historyInsertStoriesStmt = db.prepare("INSERT INTO tbl_history_stories (key, points, timespent) VALUES ($key,$points,$timespent)");
		let historyInsertCycleStmt = db.prepare("INSERT INTO tbl_history_cycle (key, points, phase, timespent) VALUES ($key, $points, $phase, $timespent)");

		console.log("Creating database schema created.");

		getHistoricalData(CONFIG, (jiraData) => {
			let mergedIssues = jiraData.filter((issue) => {
				return issue.fields["customfield_"+CONFIG.fields.storyPoints] && issue.fields.status.name === CONFIG.done;
			}).map((issue) => {
				return {
					key : issue.key,
					points : issue.fields["customfield_"+CONFIG.fields.storyPoints],
					timespent : issue.fields.timespent,
					changelog : issue.changelog.histories.filter((change) => change.items[0].field === "status")
				}
			});

			let cyclePreProcessedData = mergedIssues.map((issue) => {
					return {
						key : issue.key,
						points : issue.points,
						changelog : issue.changelog.map((change) => {
							return {
								happened : change.created,
								src : change.items[0].fromString,
								dest : change.items[0].toString
							}
						}).map((change, i, list) => {
							let changeDate = i > 0 ? list.splice(i-1,1).find((_c) => _c.dest === change.src) : null;
							let changeStarted = changeDate ? new Date(changeDate.happened).getTime() : 0;

							return {
								phase : change.src,
								timespent : new Date(change.happened).getTime() - changeStarted
							}
						})
						
					}
			});

			cyclePreProcessedData.forEach((issue) => {
				issue.changelog.forEach((change) => {
					historyInsertCycleStmt.run({$key : issue.key, $points : issue.points , $phase : change.phase, $timespent : change.timespent});
				});
			});

			mergedIssues.forEach((issue) => {
				historyInsertStoriesStmt.run({$key : issue.key, $points : issue.points, $timespent : issue.timespent});
			});
		}, () => {
			app.listen(port, () => {
				console.log("Server is listening on port "+port);
			});
		});
	});


	/**
	 * A REST API that returns three-point statistical data on cycle time
	 */
	app.get("/three-pt-data/cycle", (req,res) => {
		res.json({message : "A REST API that returns three-point statistical data on cycle time"});
	});

	/**
	 * A REST API that returns three-point statistical data on stories
	 */
	app.get("/three-pt-data/stories", (req,res) => {
		res.json({message : "A REST API that returns three-point statistical data on stories"});
	});

	/**
	 * A REST API that returns historical data on phases
	 */
	app.get("/data/phases", (req,res) => {
		db.all("SELECT key, phase, points, SUM(timespent) as timespent FROM tbl_history_cycle GROUP BY key,phase", (err, results) => {
			res.json(results);
		});
	});

	/**
	 * A REST API that returns historical data on stories
	 */
	app.get("/data/stories", (req,res) => {
		db.all("SELECT key, points, timespent FROM tbl_history_stories", (err, results) => {
			res.json(results);
		});
	});

	/**
	 * A REST API that returns historical data on stories
	 */
	app.get("/sprint/data", (req,res) => {
		res.json({message : "A REST API that forwards sprint-data from JIRA"});
	});

	/**
	 * A REST API that forwards sprint task-data from JIRA
	 */
	app.get("/sprint/tasks", (req,res) => {
		res.json({message : "A REST API that forwards sprint task-data from JIRA"});
	});
}

module.exports = ReportingServer;