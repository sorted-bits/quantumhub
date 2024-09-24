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

  console.log(process.name, isRunning);
  var badgeColor = isRunning ? 'success' : 'danger';

  document.getElementById(`status_${process.identifier}_chip`).innerText = process.status;
  const chip = document.getElementById(`status_${process.identifier}_chip`);
  chip.classList.remove('is-danger');
  chip.classList.remove('is-success');
  chip.classList.add(`is-${badgeColor}`);

  document.getElementById(`status_${process.identifier}_start`).disabled = isRunning;
  document.getElementById(`status_${process.identifier}_stop`).disabled = !isRunning;
};

processesStatusSubscription((process) => {
  updateProcessStatus(process);
});
