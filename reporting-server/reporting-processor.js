const ee = require("event-emitter");
const Promise = require("es6-promise").Promise;

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
function removeNoise(rawChangeList) {
	let changeList = rawChangeList.map((time) => Number(time)).sort((a,b) => a - b).filter((time) => time > 0).sort((a,b) => a-b);
	console.log("Filter 1");
	let processed = [].concat(changeList)
					 .map((timespent) => Math.log10(timespent))
					 .map((log, index, list) => (index > 0 ? log / list[index-1] : 0) % 1);

	console.log("Filter 2");
	let processedForThreshold = [].concat(processed).sort((dec1,dec2) => dec1 - dec2);
	
	console.log("Filter 3");
	let minThreshIndex = Math.floor(processedForThreshold.length * 0.95);
	let maxThreshIndex = Math.floor(processedForThreshold.length * 0.97);

	console.log("Filter 4");

	let minThresh = processedForThreshold[minThreshIndex];
	let maxThresh = processedForThreshold[maxThreshIndex];



	// here we are choosing the index points highlighted by outliers
	// e.g. [1,3,100,105], and the threshold for difference is 5, then 100 is marked as an outlier
	// so this process will give us a list with an outlier [2]
	// additionally we are adding the index 0, and the end of list
	// so that we can choose between the segments 0..2,2..3, and choose the biggest segment.
	// 
	// Marked points will be excluded.
	
	let minSegmentsPoints = processed.map((item, index) => { return { item : item, index : index}}).filter((item) => item.item >= minThresh)
									 .map((item) => item.index);
 	console.log("Filter 5");
	let maxSegmentsPoints = processed.map((item, index) => { return { item : item, index : index}}).filter((item) => item.item >= maxThresh)
									 .map((item) => item.index);

	console.log("Filter 6");
	/**
	 * Transforms a list of points to segments to the original list
	 * 
	 * @param  {[type]} segmentPoints [description]
	 * @return {[type]}               [description]
	 */
	let transformToSegments = (segmentPoints) => {
		segmentPoints.map((point, index, list) => {
			if (index === 0) {
				return {start : 0, end : point, size : point}
			} else if (index === list.length-1) {
				return {start : point, end : processed.length, size : (processed.length-1) - (point)}
			} else {
				return {start : list[index-1], end : point, size : point-list[index-1]}
			}
		}).sort((a,b) => b.size - a.size);
	}
	let minSeg = transformToSegments(minSegmentsPoints);
	console.log("Filter 7");
	let maxSeg = transformToSegments(maxSegmentsPoints);
	console.log("Filter 8");

	return {
		min : changeList.filter((change, index) => minSeg[0] && (index >= minSeg[0].start || index <= minSeg[0].end)),//processed.map((item, index) => { return { item : item, index : index}}).filter((item) => item.item <= minThresh).map((item) => changelist[item.index]),
		max : changeList.filter((change, index) => maxSeg[0] && (index >= maxSeg[0].start || index <= maxSeg[0].end))
	}
}


/**
 * Works out the three-point estimation values on a given list.
 * 
 * @param  {[type]}
 * @return {[type]}
 */
function getThreePointValuesFromList(list, sp) {
	return new Promise((resolve) => {
		sp && console.log("Cleaning data for ", sp);
		//list.map((time) => Number(time)).sort((a,b) => a - b).filter((time) => time > 0)
		Promise.resolve(removeNoise(list)).then((cleanedListPayload) => {
			sp && console.log("Data cleaned for ", sp);
			let sortedList = cleanedListPayload.max;
			let bestCase = sortedList[0];
			let worstCase = sortedList[sortedList.length-1];
			let mostLikely = sortedList.reduce((acc,value) => acc + value, 0) / sortedList.length;

			let sd = (worstCase - bestCase) / 6;

			let weightedaverage = (bestCase + worstCase + (4*mostLikely)) / 6;

			resolve({ sd : sd, weightedaverage : weightedaverage });
		});
	})
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
		console.log("Got payload on ",sp);
		return getThreePointValuesFromList(payload.data.map((result) => result.timespent), sp);
		
	}).then((threePointValues) => {
		console.log("Inserting story data ", sp);
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
function numberCrunchingForCyleTime(dbHandle, sp, phase) {
	dbHandle.getTimeSpentOnPhaseForPoints(phase, sp).then((payload) => {
		payload.err && console.log(payload.error);
		getThreePointValuesFromList(payload.data.map((result) => result.timespent)).then((threePointValues) => {
			console.log("Inserting cycle time data");
			dbHandle.insertTimeStatsOnPhase(sp, phase, threePointValues.sd, threePointValues.weightedaverage);
		});
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

		Promise.resolve().then(() => new Promise((resolve) => {

			let crunchSPData = STORY_POINTS.reduce((promiseChain, sp) => {
					return promiseChain.then(() => new Promise((resolve) => {
						console.log(sp);
						calls.numberCrunching(sp);
						resolve();
					}));
			}, Promise.resolve());

			crunchSPData.then(() => {
				console.log("Processed SP Data");
			});

			// STORY_POINTS.forEach((storyPointValue) => {
			// });

			STORY_POINTS.forEach((storyPointValue) => {
				dbHandle.getDistinctPhases(storyPointValue).then((payload) => {
					payload.err && console.log(payload.error);
					if (payload.data) {
						let phases = payload.data;
						phases.forEach((phase) => {
							//console.log("Crunching numbers for phase : " + phase.phase);
							calls.numberCrunchingForCyleTime(storyPointValue, phase.phase);
						});

						resolve();
					}
				});
			})
		}))
		.then(() => new Promise((resolve) => {
			dbHandle.getDistinctPhases().then((payload) => {
				payload.err && console.log(payload.error);
				if (payload.data) {
					let phases = payload.data;
					phases.forEach((phase) => {
						dbHandle.getTimeSpentOnPhase(phase.phase).then((payload) => {
							payload.err && console.log(payload.error);
							let threePointValues = getThreePointValuesFromList(payload.data.map((row) => row.timespent));
							dbHandle.insertTimeStatsOnPhase(-1, phase.phase, threePointValues.sd, threePointValues.weightedaverage);
						});
					});

					resolve();
				}
			});
		})).then(cb);
	});

	return {
		create : (handle) => {
			emitter.emit("initialize", handle);
		},

		process : (cb) => {
			emitter.emit("process", cb);
		}
	}
}