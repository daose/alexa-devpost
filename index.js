const Alexa = require('alexa-sdk');
const request = require('request');
const moment = require('moment');

const strings = require('./strings');

const config = {
    databaseURL: 'https://alexa-154fb.firebaseio.com'
};

const saveToFirebase = (userId, path, object, callback) => {
    const url = (config.databaseURL + '/' + userId + (path ? ('/' + path) : '') + '.json');

    request.put(
        url,
        { json: object },
        callback
    );
};

const handlers = {
    'LaunchRequest': function () {
        this.emit(':ask', strings.LAUNCH, strings.REPROMPT);
    },
    'StartDurationIntent': function () {
        const duration = this.event.request.intent.slots.Duration.value;
        const userId = this.event.session.user.userId.replace(/\./g, '_');
        const target = moment().add(moment.duration(duration));
        const timeToTarget = moment().to(target, true);
        saveToFirebase(userId, 'target', target.toJSON(), () => {
            this.emit(':tell', 'Okay, you have ' + timeToTarget + ' left.');
        });
    },
    'StartTimeIntent': function () {
        const time = this.event.request.intent.slots.Time.value;
        const userId = this.event.session.user.userId.replace(/\./g, '_');
        const target = moment(time, 'HH:mm');
        const timeToTarget = moment().to(target, true);
        saveToFirebase(userId, 'target', target.toJSON(), () => {
            this.emit(':tell', 'Okay, you have ' + timeToTarget + ' left.');
        });
    },
    'GetStatusIntent': function () {
        const userId = this.event.session.user.userId.replace(/\./g, '_');
        request.get(
            config.databaseURL + '/' + userId + '.json',
            (e, r, obj) => {
                if (!obj) this.emit('LaunchRequest');
                const user = JSON.parse(obj);
                if (!user.target) this.emit('LaunchRequest');
                const target = moment(user.target);
                const timeToTarget = moment().to(target, true);
                if (moment().isAfter(target)) {
                    this.emit(':tell', 'You should have left ' + timeToTarget + ' ago!');
                } else {
                    this.emit(':tell', 'You still have ' + timeToTarget);
                }
            }
        );
    },
    'LeaveIntent': function () {
        const userId = this.event.session.user.userId.replace(/\./g, '_');
        request.get(
            config.databaseURL + '/' + userId + '.json',
            (e, r, obj) => {
                if (!obj) this.emit(':tell', 'See you later');
                const user = JSON.parse(obj);
                if (!user.target) this.emit(':tell', 'See you later');
                const target = moment(user.target);
                const timeToTarget = moment().to(target, true);
                if (moment().isAfter(target)) {
                    this.emit(':tell', 'Hurry! You should have left ' + timeToTarget + ' ago.');
                } else {
                    this.emit(':tell', 'Nice! See you later. You still had ' + timeToTarget);
                }
            }
        );
    }
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
};
