async function getProcesses() {
  const response = await fetch('/api/processes');

  console.log(response);
  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const json = await response.json();
  return json;
}

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

function processStatusSubscription(callback) {
  let ws = new WebSocket('/api/processes/status');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };
}

function processLogsSubscription(identifier, level, callback) {
  console.log('Starting logs subscription', identifier);

  let ws = new WebSocket(`/api/process/${identifier}/log/${level}`);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };
  return ws;
}
