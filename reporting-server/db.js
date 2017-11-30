const sqlite3 = require("sqlite3").verbose();
const Promise = require("es6-promise").Promise;

module.exports = {
	create : () => {
		return new Promise((resolve) => {
			let db = new sqlite3.Database(":memory:");

			db.serialize(() => {
				console.log("Creating database schema...");

				db.run("CREATE TABLE tbl_history_stories (key VARCHAR(20), points SMALLINT, timespent BIGINT)");
				db.run("CREATE TABLE tbl_history_cycle (key VARCHAR(20), points SMALLINT, phase VARCHAR(30), timespent DOUBLE)");

				// tpe => three point estimation
				db.run("CREATE TABLE tbl_tpe_stories (points SMALLINT, sd BIGINT, weightedaverage BIGINT)");
				db.run("CREATE TABLE tbl_tpe_cycle (points SMALLINT, phase VARCHAR(30), sd BIGINT, weightedaverage BIGINT)");

				let historyInsertStoriesStmt = db.prepare("INSERT INTO tbl_history_stories (key, points, timespent) VALUES ($key,$points,$timespent)");
				let historyInsertCycleStmt = db.prepare("INSERT INTO tbl_history_cycle (key, points, phase, timespent) VALUES ($key, $points, $phase, $timespent)");

				resolve({
					insertStoryData : (issue) => {
						historyInsertStoriesStmt.run({$key : issue.key, $points : issue.points, $timespent : issue.timespent});
					},
					insertCycleTimeData : (issue, change) => {
						historyInsertCycleStmt.run({$key : issue.key, $points : issue.points , $phase : change.phase, $timespent : change.timespent});
					}
				});
			});

		});
	}
};