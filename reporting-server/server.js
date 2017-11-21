const express = require("express");
var sqlite3 = require("sqlite3").verbose();

function ReportingServer(config) {
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

		console.log("Creating database schema created.");

		app.listen(port, () => {
			console.log("Server is listening on port "+port);
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
	app.get("/data/stories", (req,res) => {
		res.json({message : "A REST API that returns historical data on phases"});
	});

	/**
	 * A REST API that returns historical data on stories
	 */
	app.get("/data/stories", (req,res) => {
		res.json({message : "A REST API that returns historical data on stories"});
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