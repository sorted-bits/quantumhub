let loggingWs;
let logLevel = localStorage.getItem(`${identifier}-logLevel`) || 'info';

const filterLogs = (level) => {
  logLevel = level;

  if (loggingWs) {
    loggingWs.close();
  }

  subscribeToLogs(level);
  setButtonState(level);

  // Write log level to local storate
  localStorage.setItem(`${identifier}-logLevel`, level);
};

const setButtonState = (level) => {
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((level) => {
    const tab = document.getElementById(`${level}-filter`);
    tab.classList.remove('is-active');
  });

  const tab = document.getElementById(`${level}-filter`);
  tab.classList.add('is-active');
};

const subscribeToLogs = (level) => {
  const tableBody = document.getElementById('logs');
  tableBody.innerHTML = '';

  loggingWs = processLogsSubscription(identifier, level, (data) => {
    const log = [data.message, ...data.messages];
    console.log(log);
    const messages = log.join(', ');
    const row = document.createElement('tr');
    row.innerHTML = `<td>${data.time}</td><td>${data.level}</td><td>${messages}</td>`;
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
  subscribeToLogs(logLevel);

  document.getElementById('title').innerText = process.name;
});
