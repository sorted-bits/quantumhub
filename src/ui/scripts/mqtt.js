function mqttStatusSubscription(callback) {
    let ws = new WebSocket('/api/mqtt/status');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        callback(data);
    };

    ws.onerror = (event) => {
        console.log('Error occured', event);
    }

    ws.onclose = () => {
        console.log('MQTT status websocket closed');
        setTimeout(() => {
            mqttStatusSubscription(callback);
        }, 2000);
    };
    return ws;
}

mqttStatusSubscription((data) => {
    if (data.connected) {
        document.getElementById('status_start').disabled = true;
        document.getElementById('status_stop').disabled = false;
        document.getElementById('status_restart').disabled = false;
    } else {
        document.getElementById('status_start').disabled = false;
        document.getElementById('status_stop').disabled = true;
        document.getElementById('status_restart').disabled = true;
    }
});

function onMqttStart() {
    fetch('/api/mqtt/status/connect', {
        method: 'POST'
    });
}

function onMqttStop() {
    fetch('/api/mqtt/status/disconnect', {
        method: 'POST'
    });
}

function onMqttRestart() {
    fetch('/api/mqtt/status/reconnect', {
        method: 'POST'
    });
}