var ee = require("event-emitter");


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