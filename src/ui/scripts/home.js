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

  var badgeColor = process.status.toLowerCase() === 'running' ? 'success' : 'danger';

  document.getElementById(`status_${process.identifier}_chip`).innerText = process.status;
  const chip = document.getElementById(`status_${process.identifier}_chip`);
  chip.classList.remove('text-bg-danger');
  chip.classList.remove('text-bg-success');

  if (process.status.toLowerCase() === 'running') {
    chip.classList.add('text-bg-success');
  } else {
    chip.classList.add('text-bg-danger');
  }

  document.getElementById(`status_${process.identifier}_start`).disabled = process.status.toLowerCase() === 'running';
  document.getElementById(`status_${process.identifier}_stop`).disabled = !(process.status.toLowerCase() === 'running');
};

processStatusSubscription((process) => {
  updateProcessStatus(process);
});

getProcesses().then((processes) => {
  console.log(processes);
  const contentNode = document.getElementById('processes-table-body');

  processes.data.forEach((process) => {
    const row = document.createElement('tr');

    var startEnabled = process.status.toLowerCase() !== 'running' ? '' : 'disabled=""';
    var stopEnabled = process.status.toLowerCase() === 'running' ? '' : 'disabled=""';

    var badgeColor = process.status.toLowerCase() === 'running' ? 'success' : 'danger';

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const time = new Date(process.startTime).toLocaleTimeString('en', { timeStyle: 'short', hour12: false, timeZone: timeZone });
    const date = new Date(process.startTime).toLocaleDateString('en', { dateStyle: 'short', hour12: false, timeZone: timeZone });

    row.innerHTML = `
              <td><a href="/process/details?identifier=${process.identifier}">${process.name}</a></td>
              <td>
                <span class="badge text-bg-${badgeColor}" id="status_${process.identifier}_chip">${process.status}</span>
              </td>
              <td>${date} ${time}</td>
              <td>
                <button style="--bs-btn-padding-y: 0.35em; --bs-btn-padding-x: 0.65em; --bs-btn-font-size: 0.75em; line-height: 12px;" id="status_${process.identifier}_start" ${startEnabled} class="btn btn-success btn-sm" onclick="onStartProcessClicked('${process.identifier}')"><i class="fa-solid fa-play"></i></button>
                <button style="--bs-btn-padding-y: 0.35em; --bs-btn-padding-x: 0.65em; --bs-btn-font-size: 0.75em; line-height: 12px;" id="status_${process.identifier}_stop" ${stopEnabled} class="btn btn-danger btn-sm" type="" class="bg-sky-500" onclick="onStopProcessClicked('${process.identifier}')"><i class="fa-solid fa-stop"></i></button>
              </td>
            `;
    contentNode.appendChild(row);
  });
});
