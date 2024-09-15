const searchParams = new URLSearchParams(window.location.search);
console.log(searchParams);

if (!searchParams.has('identifier')) {
  console.error('No identifier provided');
  throw new Error('No identifier provided');
}

const identifier = searchParams.get('identifier');
console.log(identifier);

let loggingWs;
let logLevel = localStorage.getItem(`${identifier}-logLevel`) || 'info';

const getProcess = async () => {
  const process = await fetch(`/api/process/${identifier}`);
  return process.json();
};

const getConfig = async () => {
  const config = await fetch(`/api/process/${identifier}/config`);
  return config.json();
};

const filterLogs = (level) => {
  logLevel = level;

  loggingWs.close();
  subscribeToLogs(level);
  setButtonState(level);

  // Write log level to local storate
  localStorage.setItem(`${identifier}-logLevel`, level);
};

const setButtonState = (level) => {
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((level) => {
    const tab = document.getElementById(`${level}-tab`);
    tab.setAttribute('aria-selected', 'false');
  });

  const tab = document.getElementById(`${level}-tab`);
  tab.setAttribute('aria-selected', 'true');
};

const subscribeToLogs = (level) => {
  const tableBody = document.getElementById('logs');
  tableBody.innerHTML = '';

  loggingWs = processLogsSubscription(identifier, level, (data) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${data.time}</td><td>${data.level}</td><td>${data.message}</td>`;
    tableBody.prepend(row);

    if (tableBody.childElementCount > 20) {
      tableBody.removeChild(tableBody.lastChild);
    }
  });
};

getProcess().then((process) => {
  console.log(process);

  getConfig().then((config) => {
    console.log(config);
  });

  setButtonState(logLevel);
  loggingWs = processLogsSubscription(identifier, logLevel, (data) => {
    const tableBody = document.getElementById('logs');
    console.log(data);
    const row = document.createElement('tr');
    row.innerHTML = `<td>${data.time}</td><td>${data.level}</td><td>${data.message}</td>`;
    tableBody.prepend(row);

    if (tableBody.childElementCount > 20) {
      tableBody.removeChild(tableBody.lastChild);
    }
  });

  document.getElementById('title').innerText = process.name;
});
