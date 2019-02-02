/*
This is a sample Slack bot built with Botkit.
*/

var Botkit = require('botkit')
var fs = require('fs') // NEW: Add this require (for loading from files).

var controller = Botkit.slackbot({debug: false})

var config = {
  min_seconds_to_assume_new_topic: 30,
  consecutive_message_threshold: 3,
  timeout_before_re_alert_user: 360,
  timeout_before_re_alert_channel: 1800
}
var channel_data = {}
var user_data = {}

// START: Load Slack token from file.
if (!process.env.slack_token_path) {
  console.log('Error: Specify slack_token_path in environment')
  process.exit(1)
}

fs.readFile(process.env.slack_token_path, function (err, data) {
  if (err) {
    console.log('Error: Specify token in slack_token_path file')
    process.exit(1)
  }
  data = String(data)
  data = data.replace(/\s/g, '')
  controller
    .spawn({token: data})
    .startRTM(function (err) {
      if (err) {
        throw new Error(err)
      }
    })
})

var user_replying_to_self_in_channel = function(message) {
  rm = message.raw_message
  if(rm.type == 'message' && rm.channel.match(/^C/) && cd = channel_data[rm.channel]) {
    return cd.last_message_user == rm.user
  }
  return false
}


controller.middleware.ingest.use(function(bot, message, res, next) {
  rm = message.raw_message
  if(rm.type == 'user_typing' && rm.channel.match(/^C/)) {
    console.log('1')
    if(cd = channel_data[rm.channel]) {
      console.log('2')
      if(Date.now() - cd.last_message_time < (config.min_seconds_to_assume_new_topic * 1000)) {
        console.log('3')
        if(ud = user_data[rm.user]) {
          console.log('4')
          if(Date.now() - ud.last_reminder > (config.timeout_before_re_alert_user * 1000)) {
            console.log('5')
            if(user_replying_to_self_in_channel(message)) {
              reply = "Pssst! It looks like you are replying to your own message when you could be using a thread. Please disregard if my instinct is wrong."
            } else {
              reply = "Pssst! It looks like you are replying to a message when you could be using a thread. Please disregard if my instinct is wrong."
            }
            bot.sendEphemeral({
              channel: rm.channel,
              user: rm.user,
              as_user: true,
              text: reply
            })
            user_data[rm.user].last_reminder = Date.now()
            console.log(user_data)
            console.log(channel_data)
          }
        }
      }
    }
  }
  next();
});

controller.middleware.ingest.use(function(bot, message, res, next) {
  rm = message.raw_message
  if(rm.type == 'message' && rm.channel.match(/^C/)) {
    console.log('1a')
    if(!channel_data[rm.channel]) {
      console.log('2a')
      channel_data[rm.channel] = {}
    }
    channel_data[rm.channel].last_message_time = Date.now()
    channel_data[rm.channel].last_message_user = rm.user
    if(!user_data[rm.user]) {
      console.log('3a')
      user_data[rm.user] = {}
    }
    user_data[rm.user].last_message_time = Date.now()
    user_data[rm.user].last_reminder = 0
  }
  next();
});
