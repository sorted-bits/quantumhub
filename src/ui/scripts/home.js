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

getProcesses().then((processes) => {
  console.log(processes);
  const contentNode = document.getElementById('processes-table-body');

  processes.data.forEach((process) => {
    var isRunning = process.status.toLowerCase() === 'running';

    const row = document.createElement('tr');

    var startEnabled = !isRunning ? '' : 'disabled=""';
    var stopEnabled = isRunning ? '' : 'disabled=""';
    var badgeColor = isRunning ? 'success' : 'danger';

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const time = new Date(process.startTime).toLocaleTimeString('en', { timeStyle: 'short', hour12: false, timeZone: timeZone });
    const date = new Date(process.startTime).toLocaleDateString('en', { dateStyle: 'short', hour12: false, timeZone: timeZone });

    row.innerHTML = `
              <td><a href="/process/${process.identifier}">${process.name}</a></td>
              <td>
                <span class="tag is-${badgeColor}" id="status_${process.identifier}_chip">${process.status}</span>
              </td>
              <td>${date} ${time}</td>
              <td>
                <button id="status_${process.identifier}_start" ${startEnabled} class="button is-success is-small" onclick="onStartProcessClicked('${process.identifier}')"><i class="fa-solid fa-play"></i></button>
                <button id="status_${process.identifier}_stop" ${stopEnabled} class="button is-danger is-small" onclick="onStopProcessClicked('${process.identifier}')"><i class="fa-solid fa-stop"></i></button>
              </td>
            `;
    contentNode.appendChild(row);
  });
});
