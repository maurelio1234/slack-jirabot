'use strict';

const logger = require('../logger')();

/**
 * @module Start
 */
class Start {

  constructor (jira, config) {
    this.jira = jira;
    this.config = config;
  }

  canHandleMessage (message) {
    return message.text.startsWith('start');
  }

  handleMessage (talker) {
    const issueId = talker.message.text.split(' ')[1];
    this.jira.transitionIssue(issueId, {transition: {id: 11 }})
        .then((r) => {
          talker.sayText('Done');
        })
        .catch((error) => {
          talker.sayText(error);
        });
  }
}
module.exports = Start;
