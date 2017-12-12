const express = require("express");

module.exports = (dbHandle) => {
	console.log("Creating reporting-server endpoints");
	let app = express();
	app.use((req,res,next) => {
		res.header("Access-Control-Allow-Origin", "localhost");
	  	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	  	next();
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
		dbHandle.getCycleTimeData().then((payload) => {
			res.json(payload.data);
		});
	});

	/**
	 * A REST API that returns historical data on stories
	 */
	app.get("/data/stories", (req,res) => {
		dbHandle.getStoryData().then((payload) => {
			res.json(payload.data);
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

	

	reportingServer =  {
		listen : (port, cb) => {
			app.listen(port, cb);
		}
	}


	return reportingServer;

}
