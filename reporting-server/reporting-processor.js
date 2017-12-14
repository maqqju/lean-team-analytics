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
 * @param  {Object} dbHandle : handle to server db
 * @param  {[type]}
 * @return {[type]}
 */
function numberCrunching(dbHandle, sp) {

	dbHandle.getTimeSpentOnPoints(sp).then((payload) => {
		let threePointValues = getThreePointValuesFromList(results.map((result) => result.timespent));
		dbHandle.insertTimeStatsOnPoints(sp, threePointValues.sd, threePointValues.weightedaverage);
	});
}


/**
 * Crunches a given value for cycle time and inserts it to DB
 * @param  {[type]}
 * @param  {[type]}
 * @return {[type]}
 * 
 */
//@flow
function numberCrunchingForCyleTime(dbHandle, sp, phase) {

	dbHandle.getTimeSpentOnPhaseForPoints(phase, sp).then((payload) => {
		let threePointValues = getThreePointValuesFromList(payload.data.map((result) => result.timespent));
		dbHandle.insertTimeStatsOnPhase(sp, phase, threePointValues.sd, threePointValues.weightedaverage);
	});	
}


module.exports = () => {
	let dbHandle;
	let emitter = ee();

	let calls = {
		numberCrunching : null,
		numberCrunchingForCyleTime : null
	}

	emitter.on("initialize", (handle) => {
		dbHandle = handle;
		calls.numberCrunching = numberCrunching.bind(null, dbHandle);
		calls.numberCrunchingForCyleTime = numberCrunchingForCyleTime.bind(null, dbHandle);
	});

	emitter.on("process", (cb) => {
		if(!dbHandle) {
			console.log("No handle for DB found");	
			return;
		} 
		console.log("Processing");
		
		STORY_POINTS.forEach((storyPointValue) => {
			calls.numberCrunching(storyPointValue);
			dbHandle.getDistinctPhases(storyPointValue).then((payload) => {
				if (payload.data) {
					let phases = payload.data;
					phases.forEach((phase) => {
						calls.numberCrunchingForCyleTime(storyPointValue, phase.phase);
					});
				}
			});
		});

		dbHandle.getDistinctPhases().then((payload) => {
			if (payload.data) {
				let phases = payload.data;

				phases.forEach((phase) => {
					dbHandle.getTimeSpentOnPhase(phase).then((payload) => {
						let threePointValues = getThreePointValuesFromList(payload.data.map((row) => row.timespent));
						dbHandle.insertTimeStatsOnPhase(-1, phase.phase, threePointValues.sd, threePointValues.weightedaverage);
					});
				});
			}
		});
	});

	return {
		create : (handle) => {
			emitter.emit("initialize", handle);
		},

		process : () => {
			emitter.emit("process", cb);
		}
	}
}