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

const updateProcessStatus = (process) => {
  console.log(process);

  var isRunning = process.status.toLowerCase() === 'running';
  var badgeColor = isRunning ? 'success' : 'danger';

  document.getElementById(`status_${process.identifier}_chip`).innerText = process.status;
  const chip = document.getElementById(`status_${process.identifier}_chip`);
  chip.classList.remove('is-danger');
  chip.classList.remove('is-success');
  chip.classList.add(`is-${badgeColor}`);

  document.getElementById(`status_${process.identifier}_start`).disabled = isRunning;
  document.getElementById(`status_${process.identifier}_stop`).disabled = !isRunning;
};

setButtonState(logLevel);
subscribeToLogs(logLevel);

processStatusSubscription(identifier, (process) => {
  updateProcessStatus(process);
});
