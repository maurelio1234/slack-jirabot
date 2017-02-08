'use strict';

const logger = require('../logger')();

class OpenIssues {

  constructor (jira, config) {
    this.jira = jira;
    this.config = config;
  }

  canHandleMessage (message) {
    return message.text.startsWith('open issues');
  }

  handleMessage (talker) {
    const project = talker.message.text.split(' ')[2];
    this.jira.searchJira(`project = ${project} AND Status = \'To Do\' AND Type = Bug ORDER BY priority DESC, created`)
        .then((r) => {
          logger.info(r);
          var res = "";

          var issue;
          for(issue of r.issues) {
            res += `*${issue.key}*: *${issue.fields.priority.name}* - ${issue.fields.summary}\n`;
            
            if (issue.fields.subtasks) {
              var subtask;
              for(subtask of issue.fields.subtasks) {
                res += `\t*${subtask.key}*: *${subtask.fields.priority.name}* - ${subtask.fields.summary}\n`;
              }
            }
          }
          talker.sayText(res);
        })
        .catch((error) => {
          talker.sayText(error);
        });
  }

  shortHelp() {
    return '*open issues*: lists open issues\n';
  }
}
module.exports = OpenIssues;
