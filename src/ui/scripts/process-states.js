var states = {};
var selectedState = undefined;

function processStateSubscription(identifier, callback) {
  console.log('Starting state subscription', identifier);

  let ws = new WebSocket(`/api/process/${identifier}/state`);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };
}

function selectState(key) {
  selectedState = key;

  const stateDetails = document.getElementById('state-details');
  stateDetails.style.display = 'block';

  stateDetails.querySelectorAll('.attribute-details').forEach((detail) => {
    detail.style.display = 'none';
  });

  const attributeDetails = document.getElementById(`attribute-${key}`);
  if (attributeDetails) {
    attributeDetails.style.display = 'block';
  } else {
    console.warn('No attribute details found for', key);
  }

  renderHistory();
}

function renderHistory() {
  const historyTable = document.getElementById('state-history');

  historyTable.innerHTML = '';

  states[selectedState].forEach((data) => {
    const historyRow = document.createElement('tr');

    const timestampCell = document.createElement('td');
    timestampCell.innerText = new Date(data.timestamp).toLocaleTimeString();
    historyRow.appendChild(timestampCell);

    const historyCell = document.createElement('td');
    historyCell.innerText = JSON.stringify(data.value);
    historyRow.appendChild(historyCell);

    historyTable.prepend(historyRow);
  });
}

processStateSubscription(identifier, (state) => {
  const table = document.getElementById('attribute-list');
  const keys = Object.keys(state);

  keys.forEach((key) => {
    if (!states[key]) {
      states[key] = [];
    }

    const history = states[key];

    const data = {
      value: state[key],
      timestamp: Date.now(),
    };

    history.push(data);

    states[key] = history.slice(-10);

    if (key === selectedState) {
      renderHistory();
    }

    const value = state[key];
    const id = `attribute-${key}-row`;

    const existingRow = document.getElementById(id);
    if (existingRow) {
      existingRow.querySelector('.value').innerText = JSON.stringify(value);
    } else {
      const row = document.createElement('tr');
      row.id = id;

      const link = document.createElement('a');
      link.setAttribute('onclick', `selectState('${key}')`);
      link.href = '#';
      link.title = key;

      link.appendChild(document.createTextNode(key));

      const nameCell = document.createElement('td');
      nameCell.classList.add('key');
      //      nameCell.innerText = key;
      nameCell.appendChild(link);

      const valueCell = document.createElement('td');
      valueCell.classList.add('value');
      valueCell.innerText = JSON.stringify(value);

      row.appendChild(nameCell);
      row.appendChild(valueCell);

      table.appendChild(row);
    }
  });
});
