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

const updateProcessStatus = (process) => {
  console.log(process);

  var isRunning = process.status.toLowerCase() === 'running';
  var isAvailable = process.availability === true;

  const availabilityText = isAvailable ? 'AVAILABLE' : 'UNAVAILABLE';

  setChip(`status_${process.identifier}_chip`, isRunning, process.status);
  setChip(`availability_${process.identifier}_chip`, isAvailable, availabilityText);

  document.getElementById(`status_${process.identifier}_start`).disabled = isRunning;
  document.getElementById(`status_${process.identifier}_stop`).disabled = !isRunning;
};

processesStatusSubscription((process) => {
  updateProcessStatus(process);
});
