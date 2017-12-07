const Promise = require("es6-promise").Promise;
const http = require("https");
const reportingDb = require("./reporting-db");
const reportingEndpoints = require("./reporting-endpoints");



/**
 * Encodes a string to Base 64
 * @param  {String} string - String to encode
 * @return {String}        - Encoded input string to Base 64
 */
function btoa(string) {
	return new Buffer(string).toString("base64");
}

/**
 * Retrieves historical data from JIRA REST API using the CONFIg input by the user in he setup.
 * 
 * @param  {JSON}   	CONFIG     	- The JSON configuration saved by the user when setting up
 * @param  {Function}   insertData 	- The function called when data is retrieved, used to insert the data in to the SQLite databse
 */
function getHistoricalData(CONFIG, insertData) {

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

		return new Promise((resolve) => {
			var dataRequest = http.request(options, (res) => {
				var chunks = [];

				res.on("data", (chunk) => {
					chunks.push(chunk);
				});

				res.on("end", () => {
					var body = JSON.parse(Buffer.concat(chunks));
					insertData && insertData(body.issues);
					if (startAt < body.total) {
						getData(page ? page+1 : 1).then(resolve);
					} else {
						resolve();
					}
				});
			});

			dataRequest.on("error", (e) => {
				console.log("Problem with request ", e);
			});

			dataRequest.end();
		});

	}

	return new Promise((resolve) => {
		getData(0).then(resolve);
	});
}

/**
 * Creates a server that collects data from JIRA REST API, processes it, and saves it in a local in-memory SQLite database.
 * The server then exposes a number of REST APIs to be consumed for performance monitoring.
 * @param {JSON} CONFIG - The JSON configuration saved by the user when setting up
 */
function ReportingServer(CONFIG) {

	let insertFunction = (dbHandle, jiraData) => {
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
				dbHandle.insertCycleTimeData(issue, change);
			});
		});

		mergedIssues.forEach((issue) => {
			dbHandle.insertStoryData(issue);
		});
	}
	let port = process.env.SERVER_PORT || 6970;

	process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";


	let InMemoryDatabase = reportingDb();
	let app;
	InMemoryDatabase.create().then((dbHandle) => {
								app = reportingEndpoints(dbHandle);
							 	return getHistoricalData(CONFIG, insertFunction.bind(this, dbHandle));
							 })
							 .then(() => {
							  	 new Promise((resolve) => {
								 	 console.log("Processing");
									 resolve();
								 });
							 }).then(() => {
								app.listen(port, () => {
									console.log("Server is listening on port "+port);
								});
							 });
	
}

module.exports = ReportingServer;