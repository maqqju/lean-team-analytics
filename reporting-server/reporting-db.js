const sqlite3 = require("sqlite3").verbose();
const Promise = require("es6-promise").Promise;

module.exports = () => {
	let db;
	let insertStatements = {
		insertStoryData : null,
		insertCycleTimeData : null
	};

	let dbHandle =  {

		/**
		 * Creates a new database and returns the db-handle
		 * @return {Promise}
		 */
		create : () => {
			return new Promise((resolve) => {
				db = db || new sqlite3.Database(":memory:");
				db.serialize(() => {
					console.log("Creating database schema...");
	
					db.run("CREATE TABLE tbl_history_stories (key VARCHAR(20), points SMALLINT, timespent BIGINT)");
					db.run("CREATE TABLE tbl_history_cycle (key VARCHAR(20), points SMALLINT, phase VARCHAR(30), timespent DOUBLE)");
	
					// tpe => three point estimation
					db.run("CREATE TABLE tbl_tpe_stories (points SMALLINT, sd BIGINT, weightedaverage BIGINT)");
					db.run("CREATE TABLE tbl_tpe_cycle (points SMALLINT, phase VARCHAR(30), sd BIGINT, weightedaverage BIGINT)");
	
					insertStatements.insertStoryData = db.prepare("INSERT INTO tbl_history_stories (key, points, timespent) VALUES ($key,$points,$timespent)");
					insertStatements.insertCycleTimeData = db.prepare("INSERT INTO tbl_history_cycle (key, points, phase, timespent) VALUES ($key, $points, $phase, $timespent)");

					console.log("Database schema created.")
					resolve(dbHandle);
				});
	
			});
		},

		insertCycleTimeData : (issue, change) => {
			!insertStatements.insertCycleTimeData && console.error("[ERROR] No insert statement for cycle-time found.");
			insertStatements.insertCycleTimeData && insertStatements.insertCycleTimeData.run({$key : issue.key, $points : issue.points , $phase : change.phase, $timespent : change.timespent});
		},

		insertStoryData : (issue) => {
			insertStatements.insertStoryData && insertStatements.insertStoryData.run({$key : issue.key, $points : issue.points, $timespent : issue.timespent});
			!insertStatements.insertStoryData && console.error("[ERROR] No insert statement for story data found.");
		},

		getCycleTimeData : () => {
			return new Promise((resolve) => {
				db.all("SELECT key, phase, points, SUM(timespent) as timespent FROM tbl_history_cycle GROUP BY key,phase", [], (err, results) => {
					resolve({error : err, data : results});
				});
			})
		},

		getStoryData : () => new Promise((resolve) => {
			db.all("SELECT * FROM tbl_history_stories", [], (err, results) => {
				resolve({error : err, data : results});
			});
		})

	};

	return dbHandle;
}