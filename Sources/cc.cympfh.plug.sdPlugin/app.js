/* global $CC, Utils, $SD */
$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    // Subscribe to the willAppear and other events
    $SD.on('cc.cympfh.plug.action.willAppear', (jsonObj) => action.onWillAppear(jsonObj));
    $SD.on('cc.cympfh.plug.action.willDisappear', (jsonObj) => action.onWillDisappear(jsonObj));
    $SD.on('cc.cympfh.plug.action.keyUp', (jsonObj) => action.onKeyUp(jsonObj));
    $SD.on('cc.cympfh.plug.action.keyDown', (jsonObj) => action.onKeyDown(jsonObj));
    $SD.on('cc.cympfh.plug.action.sendToPlugin', (jsonObj) => action.onSendToPlugin(jsonObj));
    $SD.on('cc.cympfh.plug.action.didReceiveSettings', (jsonObj) => action.onDidReceiveSettings(jsonObj));
    $SD.on('cc.cympfh.plug.action.propertyInspectorDidAppear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });
    $SD.on('cc.cympfh.plug.action.propertyInspectorDidDisappear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: red; font-size: 13px;', '[app.js]propertyInspectorDidDisappear:');
    });
};

const switchbot = {
    status: async function(api_token, device_id) {
        const url = `https://api.switch-bot.com/v1.0/devices/${device_id}/status`;
        console.log(url);
        let res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': api_token,
                'cache': 'no-cache',
                'Content-Type': 'application/json; charset: utf8'
            }
        });
        return res.json();
    },
    toggle: async function(api_token, device_id, old_status) {
        const url = `https://api.switch-bot.com/v1.0/devices/${device_id}/commands`;
        const body = JSON.stringify({
            commandType: "command",
            command: old_status == 'off' ? "turnOn" : "turnOff"
        });
        console.log(url);
        let res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': api_token,
                'Content-Type': 'application/json; charset: utf8'
            },
            body: body
        });
        return res.json();
    }
};

// ACTIONS
const action = {

    settings: {},

    showStatus: function(self, jsn) {
        self.debug(`self.clockId = ${self.clockId}`, 'showStatus');
        if (!self.clockId) {
            self.debug('Set New clockId');
            self.clockId = setInterval(self.showStatus, 10000, self, jsn);
        }
        switchbot.status(self.settings.api_token, self.settings.device_id)
            .then(data => {
                self.debug(`data=${JSON.stringify(data)}`, 'showStatus');
                self.settings.power = data.body.power;
                self.setTitle(jsn, self.settings.power);
            });
    },

    toggle: function(jsn) {
        this.setTitle(jsn, '...');
        switchbot.toggle(this.settings.api_token, this.settings.device_id, this.settings.power)
          .then(data => {
              this.debug(JSON.stringify(data), 'toggle');
              setTimeout(this.showStatus, 4000, this, jsn);
          });
    },

    onDidReceiveSettings: function(jsn) {
        this.debug(jsn, 'onDidReceiveSettings', 'red');
        this.settings = Utils.getProp(jsn, 'payload.settings', {});
        this.debug(this.settings);
        this.showStatus(this, jsn);
    },

    onWillAppear: function(jsn) {
        this.debug(jsn, 'onWillAppear', 'orange');
        this.settings = Utils.getProp(jsn, 'payload.settings', {});
        this.debug(this.settings);
        this.showStatus(this, jsn);
    },

    onWillDisappear: function(jsn) {
        this.debug(jsn, 'onWillDisappear', 'pink');
        this.debug(this.settings);
    },

    onKeyDown: function(jsn) {
        this.debug(jsn, 'onKeyDown', 'blue');
        this.debug(this.settings);
        this.toggle(jsn);
    },

    onKeyUp: function(jsn) {
        this.debug(jsn, 'onKeyUp', 'green');
        this.debug(this.settings);
    },

    onSendToPlugin: function(jsn) {
        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            this.debug({ [sdpi_collection.key] : sdpi_collection.value }, 'onSendToPlugin', 'fuchsia');
        }
    },

    saveSettings: function(jsn, sdpi_collection) {
        console.log('saveSettings:', jsn);
        if (sdpi_collection.hasOwnProperty('key') && sdpi_collection.key != '') {
            if (sdpi_collection.value && sdpi_collection.value !== undefined) {
                this.settings[sdpi_collection.key] = sdpi_collection.value;
                console.log('setSettings....', this.settings);
                $SD.api.setSettings(jsn.context, this.settings);
            }
        }
    },

    setTitle: function(jsn, title) {
        this.debug(`Set title=${title}`, 'setTitle');
        $SD.api.setTitle(jsn.context, title);
    },

    debug: function(msg, caller, tagColor) {
        if (caller) {
            console.log('%c%s', `color: white; background: ${tagColor || 'grey'}; font-size: 15px;`, `[${caller}]`);
        }
        console.log(msg);
    },


};

