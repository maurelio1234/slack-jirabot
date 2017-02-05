'use strict';

const logger = require('../logger')();

/**
 * @module Done
 */
class Done {

  constructor (jira, config) {
    this.jira = jira;
    this.config = config;
  }

  canHandleMessage (message) {
    return message.text.startsWith('done');
  }

  handleMessage (talker) {
    const issueId = talker.message.text.split(' ')[1];
    this.jira.transitionIssue(issueId, {transition: {id: 91 }})
        .then((r) => {
          talker.sayText('Done');
        })
        .catch((error) => {
          talker.sayText(error);
        });
  }
}
module.exports = Done;
