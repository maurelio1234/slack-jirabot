'use strict';
const logger = require('./logger')();

class Talker {

    constructor(bot, message) {
        this.bot = bot;
        this.message = message;
    }

    sayResponse(response) {
        this.bot.reply(message, response, (err) => {
            if (err) {
                logger.info(`@${this.bot.identity.name} could not respond.`);
            } else {
                logger.info(`@${this.bot.identity.name} responded with`, response);
            }
        });
    }

    sayText(text) {
        const response = {
            as_user: true,
            attachments: [],
            text: text
        };

        this.sayResponse(response);
    }
}