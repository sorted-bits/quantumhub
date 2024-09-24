let loggingWs;
let logLevel = localStorage.getItem(`${identifier}-logLevel`) || 'info';

const onStopProcessClicked = (id) => {
  stopProcess(id).then((response) => {
    console.log(response);
  });
};

const onStartProcessClicked = (id) => {
  startProcess(id).then((response) => {
    console.log(response);
  });
};

const filterLogs = (level) => {
  logLevel = level;

  if (loggingWs) {
    loggingWs.close();
  }

  setButtonState(level);
  subscribeToLogs(level);

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
    const messages = log.join(', ');
    const row = document.createElement('tr');
    row.innerHTML = `<td>${data.time}</td><td>${data.level}</td><td>${messages}</td>`;
    tableBody.prepend(row);

    if (tableBody.childElementCount > 20) {
      tableBody.removeChild(tableBody.lastChild);
    }
  });
};

const updateProcessStatus = (identifier, status, availability) => {
  console.log('updateProcessStatus', identifier);
  console.log('updateProcessStatus', status);

  var isRunning = status.toLowerCase() === 'running';
  var isAvailable = availability === true;

  const availabilityText = isAvailable ? 'AVAILABLE' : 'UNAVAILABLE';

  setChip(`status_${identifier}_chip`, isRunning, status);
  setChip(`availability_${identifier}_chip`, isAvailable, availabilityText);

  document.getElementById(`status_${identifier}_start`).disabled = isRunning;
  document.getElementById(`status_${identifier}_stop`).disabled = !isRunning;
};

setButtonState(logLevel);
subscribeToLogs(logLevel);

updateProcessStatus(identifier, status, availability);

processStatusSubscription(identifier, (process) => {
  console.log('processStatusSubscription', process);
  updateProcessStatus(identifier, process.status, process.availability);
});
