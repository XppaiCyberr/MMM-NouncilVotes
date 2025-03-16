const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper for: " + this.name);
    },

    socketNotificationReceived: function(notification, payload) {
        // Handle socket notifications from the module here if needed in the future
    }
}); 
