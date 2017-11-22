# lean-team-analytics
A suit of tools for lean-teams to analyse themselves and improve.

## Introduction
As team lead, scrum master and, more than anything else, a fan of agile-development I am a strong believer of self-organized teams. To facilitate this, teams need to have the tools to monitor themselves for them to improve. ``lean-team-analytics`` provides an lightweight proxy server that collects data from JIRA, transforms it with basic statistical processes, and exposes it as a set of REST API services.

## How does it work?
``lean-team-analytics`` has mainly two reasons to exsist:

1. to collect data from JIRA and prepare it for statistical analysis, mainly aging charts, performance against trends and sprint execution diagrams.
2. to act as a proxy between JIRA REST API and a tool used by a team to monitor its performance, yet hindered by checks such as CORS filtering.

This tool starts by asking the user a set of questions to build a config file. These questions are:

  * JIRA base url (no need to write https://),
  * JIRA rest api search endpoint (starts with /rest/agile/...),
  * JIRA rest api board endpoint (starts with /rest/agile/...),
  * JIRA rest api sprint lookup endpoint (starts with /rest/agile/...),
  * JIRA board number (e.g. 123),
  * Name of your project (acronym),
  * Enter a user name,
  * Enter a password,
  * Name of 'DONE' phase,
  * Custom Field number for Story Points (usually represented as cf[XXXXX]. Please write ONLY the number),
  * JQL for retrieving historical data,
  * JQL for retrieving sprint task data (use ||SPRINT|| as sprint id placeholder)

It will then set up an ``SQLite3`` in-memory database, and expose its services via an ``expressjs`` server.

## Configuration

Apart from the set of questions presented in the beginning, this server takes also the following configurations:

1. ``SERVER_PORT`` inside the ``process.env``.


