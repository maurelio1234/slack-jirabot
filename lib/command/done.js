'use strict';

const logger = require('../logger')();
const J2S = require('jira2slack');
const moment = require('moment');
const PACKAGE = require('../../package');

const RESPONSE_FULL = 'full';

/**
 * @module Done
 */
class Done {

    constructor(jira, config) {
        this.jira = jira;
        this.config = config;
    }

    canHandleMessage(message) {
      return message.text.startsWith('done');
    }

    say(bot, message, response, text) {
      response.text = text;
      bot.reply(message, response, (err) => {
        if (err) {
            logger.error('Unable to respond', err);
        } else {
            logger.info(`@${bot.identity.name} responded with`, response);
        }
      });
    }

    handleMessage(bot, message, response) {
        const issueId = message.text.split(' ')[1];
        this.jira.transitionIssue(issueId, {transition: {id: 91 }})
            .then((r) => {
                this.say(bot, message, response, 'Done');
            })
        .catch((error) => {
            this.say(bot, message, response, error);
        });
    }
}
module.exports = Done;