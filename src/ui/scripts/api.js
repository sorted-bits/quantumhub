async function stopProcess(pid) {
  const response = await fetch(`/api/processes/${pid}/states/stop`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }
}

async function startProcess(pid) {
  const response = await fetch(`/api/processes/${pid}/states/start`, {
    method: 'POST',
  });

  console.log(response);
  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }
}

function processesStatusSubscription(callback) {
  let ws = new WebSocket('/api/processes/status');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };
  ws.onclose = () => {
    setTimeout(() => {
      processesStatusSubscription(callback);
    }, 500);
  };
  return ws;
}

function processStatusSubscription(identifier, callback) {
  console.log('Starting process status subscription', identifier);

  let ws = new WebSocket(`/api/process/${identifier}/status`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };

  ws.onclose = () => {
    console.log('Process status subscription closed', identifier);
    setTimeout(() => {
      processStatusSubscription(identifier, callback);
    }, 500);
  };

  return ws;
}

function processLogsSubscription(identifier, level, callback) {
  console.log('Starting logs subscription', identifier);

  let ws = new WebSocket(`/api/process/${identifier}/log/${level}`);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };

  ws.onclose = () => {
    console.log('Log subscription closed', identifier);
    setTimeout(() => {
      processLogsSubscription(identifier, level, callback);
    }, 500);
  };

  return ws;
}
