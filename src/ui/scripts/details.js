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
subscribeToLogs(identifier, logLevel);

updateProcessStatus(identifier, status, availability);

processStatusSubscription(identifier, (process) => {
  console.log('processStatusSubscription', process);
  updateProcessStatus(identifier, process.status, process.availability);
});
