const express = require("express");

function ReportingServer(config) {
	const app = express();
	process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

	let port = process.env.port || 6970;

	app.listen(port, () => {
		console.log("Server is listening on port "+port);
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