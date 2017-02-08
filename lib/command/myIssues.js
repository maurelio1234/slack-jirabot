'use strict';

const logger = require('../logger')();

class MyIssues {

  constructor (jira, config) {
    this.jira = jira;
    this.config = config;
  }

  canHandleMessage (message) {
    return message.text.startsWith('my issues');
  }

  handleMessage (talker) {
    this.jira.searchJira('assignee = marcos.almeida AND status in (Open, \'In Progress\', Reopened, \'In Review\')')
        .then((r) => {
          logger.info('got response');
          logger.info(r);
          var res = "";

          var issue;
          for(issue of r.issues) {
            res += `*${issue.key}*: *${issue.fields.status.name}* - ${issue.fields.summary}\n`;
            if (issue.fields.subtasks) {
              var subtask;
              for(subtask of issue.fields.subtasks) {
                res += `\t*${subtask.key}*: *${subtask.fields.status.name}* - ${subtask.fields.summary}\n`;
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
    return '*my issues*: lists issues associated to me\n';
  }
}
module.exports = MyIssues;
