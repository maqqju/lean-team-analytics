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
	"Custom Field number for Story Points (usually represented as cf[XXXXX]. Please write ONLY the number) : ",
	"JQL for retrieving historical data : ",
	"JQL for retrieving sprint task data (use ||SPRINT|| as sprint id placeholder) : "
]

fs.exists("reporting-server-config.json", (exists) => {
	if (exists) {
		fs.readFile("reporting-server-config.json", "utf8", (err, data) => {
			if (err) {
				return console.log(err);
			}

			let reportingServerConfig = JSON.parse(data);
			reportingServer(reportingServerConfig);
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
			let reportingServerConfig = {
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
				fields : {
					storyPoints : answers[9]
				},
				jql : {
					history : answers[10],
					sprint : answers[11]
				}
			};

			fs.writeFile("reporting-server-config.json", JSON.stringify(reportingServerConfig), (err) => {
				if (err) {
					return console.log(err);
				}

				console.log("Config file initialized");
				reportingServer(reportingServerConfig);
			});
		});
	}
});