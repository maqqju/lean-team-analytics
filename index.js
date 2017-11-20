const fs = require("fs");
const rl = require("readline").createInterface({
	input : process.stdin,
	output : process.stdout
});
const reportingServer = require("./reporting-server/server");

const Promise = require("es6-promise").Promise;

const questions = [
	"JIRA base url (no need to write https://) : ",
	"JIRA rest api search endpoint (starts with /rest/agile/...) : ",
	"JIRA rest api board endpoint (starts with /rest/agile/...) : ",
	"JIRA rest api sprint lookup endpoint (starts with /rest/agile/...) : ",
	"JIRA board number (e.g. 123) : ",
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
			reportingServer(config);
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
				jiraUrl: answers[0],
				endpoints : {
					search : answers[1],
					board : answers[2],
					sprint : answers[3]
				},
				boardNumber : answers[4],
				project : answers[5],
				username : answers[6],
				password : answers[7],
				done : answers[8],
				jql : {
					history : answers[9],
					sprint : answers[10]
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