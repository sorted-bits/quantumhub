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

  console.log(response);
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
