const fs = require("fs");
const rl = require("readline").createInterface({
	input : process.stdin,
	output : process.stdout
});

const Promise = require("es6-promise").Promise;

const questions = [
	"JIRA base url (no need to write https://) : ",
	"Name of your project (acronym) : ",
	"Enter a user name : ",
	"Enter a password : ",
	"Name of 'DONE' phase : ",
	"JQL for retrieving historical data : ",
	"JQL for retrieving sprint task data (use ||SPRINT|| as sprint id placeholder) : "
]

fs.exists("config.json", (exists) => {
	if (exists) {
		fs.readFile("config.json", "utf8", (err, data) => {
			if (err) {
				return console.log(err);
			}

			let config = JSON.parse(data);
			console.log(config.project);
		});
	} else {
		let answers = [];
		let allQuestions = questions.reduce((promiseChain, question) => {
			return promiseChain.then(() => new Promise((resolve) => {
					rl.question(question, (answer) => {
						answers.push(answer);
						resolve();
					});
				})
			); 
		}, Promise.resolve());

		allQuestions.then(() => {
			let config = {
				jiraUrl : answers[0],
				project : answers[1],
				username : answers[2],
				password : answers[3],
				done : answers[4],
				jql : {
					history : answers[5],
					sprint : answers[6]
				}
			};

			fs.writeFile("config.json", JSON.stringify(config), (err) => {
				if (err) {
					return console.log(err);
				}

				console.log("Config file initialized");
			});
		});
	}
});