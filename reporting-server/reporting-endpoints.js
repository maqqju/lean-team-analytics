const express = require("express");

module.exports = (dbHandle) => {
	console.log("Creating reporting-server endpoints")
	let app = express();
	

	reportingServer =  {
		listen : () => {

			console.log(arguments.length);
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
			app.get("/data/phases", (req,res) => {
				dbHandle.getCycleTimeData().then((err, results) => {
					console.log(results)
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
	}


	return reportingServer;

}
