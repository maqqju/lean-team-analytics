const sqlite3 = require("sqlite3").verbose();

function InMemoryDatabase() {
	return {
		create : () => {
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
			});
		}
	}
}