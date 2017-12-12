const ee = require("event-emitter");

// Using default Fibonacci sequence as story points
const STORY_POINTS = [1,2,3,5,8,13,21];



/**
 * Cleans up data from human errors (s.a. forgetting a task in a state for a very long time).
 *
 * :::NOTE:::
 * Right now using an arbitrary constant of 250 - aiming at finding a more intelligent way how to
 * find this threshold.
 * 
 * @param  {[type]}
 * @return {[type]}
 */
function removeNoise(changeList) {
	let filteredList = changelist.filter((timespent, index, list) => { return index > 0 ? Math.floor(timespent/list[index - 1]) < 250 : true});
	if (filteredList.length === changelist.length) {
		return filteredList;
	} else {
		return removeNoise(filteredList);
	}
}


/**
 * Works out the three-point estimation values on a given list.
 * 
 * @param  {[type]}
 * @return {[type]}
 */
function getThreePointValuesFromList(list) {
	let sortedList = removeNoise(list.map((time) => Number(time)).sort((a,b) => a - b).filter((time) => time > 0));
	let bestCase = sortedList[0];
	let worstCase = sortedList[sortedList.length-1];
	let mostLikely = sortedList.reduce((acc,value) => acc + value, 0) / sortedList.length;

	let sd = (worstCase - bestCase) / 6;

	let weightedaverage = (bestCase + worstCase + (4*mostLikely)) / 6;

	return {
		sd : sd,
		weightedaverage : weightedaverage
	}
}

/**
 * Crunches a given value and inserts it to DB
 *
 * :::NOTE:::
 * Needs to be reworked so that it uses dbHandle
 * 
 * @param  {[type]}
 * @return {[type]}
 */
function numberCrunching(sp) {

	// move this to DB handle
	let preparedStmt = db.prepare("SELECT timespent FROM tbl_history_stories WHERE points = $points");
	preparedStmt.all({$points : sp}, (err, results) => {
		let threePointValues = getThreePointValuesFromList(results.map((result) => result.timespent));

		db.run("INSERT INTO tbl_tpe_stories (points, sd, weightedaverage) VALUES ($points, $sd, $weightedaverage)", {
			$points : sp,
			$sd : threePointValues.sd,
			$weightedaverage : threePointValues.weightedaverage
		});
	});	
}


/**
 * Crunches a given value for cycle time and inserts it to DB
 *
 * :::NOTE:::
 * Needs to be reworked so that it uses dbHandle
 * 
 * @param  {[type]}
 * @param  {[type]}
 * @return {[type]}
 */
function numberCrunchingForCyleTime(sp, phase) {
	let preparedStmt = db.prepare("SELECT timespent FROM tbl_history_cycle WHERE points = $points AND phase = $phase AND points IS NOT NULL");
	preparedStmt.all({$points : sp, $phase : phase}, (err, results) => {
		let threePointValues = getThreePointValuesFromList(results.map((result) => result.timespent));
		db.run("INSERT INTO tbl_tpe_cycle (points, phase, sd, weightedaverage) VALUES ($points, $phase, $sd, $weightedaverage)", {
			$points : sp,
			$phase : phase,
			$sd : threePointValues.sd,
			$weightedaverage : threePointValues.weightedaverage
		});
	});	
}


module.exports = () => {
	let dbHandle;

	let emitter = ee();

	emitter.on("initialize", (handle) => {
		dbHandle = handle;
	});

	emitter.on("process", () => {
		if(!dbHandle) {
			console.log("No handle for DB found");	
			return;
		} 
		console.log("Processing");
		
		STORY_POINTS.forEach((storyPointValue) => {
			numberCrunching.call(null, storyPointValue);
		});

		let phasesStmt = db.prepare("SELECT DISTINCT(phase) as phase FROM tbl_history_cycle WHERE points = $points");
		STORY_POINTS.forEach((storyPointValue) => {
			phasesStmt.all({$points : storyPointValue}, (err, results) => {
				results.forEach((phase) => {
					numberCrunchingForCyleTime.call(null, storyPointValue, phase.phase);
				});
			});
		});

		db.all("SELECT DISTINCT(phase) as phase FROM tbl_history_cycle", (err, results) => {
			results.forEach((phase) => {
				var generalStmt = db.prepare("SELECT timespent FROM tbl_history_cycle WHERE phase = $phase AND points IS NOT NULL");
				generalStmt.all({$phase : phase.phase}, (err2, timespentOnPhase) => {
					var threePointValues = getThreePointValuesFromList(timespentOnPhase.map((result) => result.timespent));
					db.run("INSERT INTO tbl_tpe_cycle (points, phase, sd, weightedaverage) VALUES ($points, $phase, $sd, $weightedaverage)", {
						$points : -1,
						$phase : phase.phase,
						$sd : threePointValues.sd,
						$weightedaverage : threePointValues.weightedaverage
					});
				});
			});
		});
	});

	return {
		create : (handle) => {
			emitter.emit("initialize", handle);
		},

		process : () => {
			emitter.emit("process");
		}
	}
}