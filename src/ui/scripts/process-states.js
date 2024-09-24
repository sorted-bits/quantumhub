var states = {};
var selectedState = undefined;

function startAttributeSubscription(identifier, callback) {
  console.log('Starting state subscription', identifier);

  let ws = new WebSocket(`/api/process/${identifier}/attributes`);
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
    const { value, time } = data;

    const historyRow = document.createElement('tr');

    const timestampCell = document.createElement('td');
    timestampCell.innerText = time;
    historyRow.appendChild(timestampCell);

    const historyCell = document.createElement('td');
    historyCell.innerText = JSON.stringify(value);
    historyRow.appendChild(historyCell);

    historyTable.prepend(historyRow);
  });
}

startAttributeSubscription(identifier, (state) => {
  const table = document.getElementById('attribute-list');

  const { attribute, value } = state;

  if (!states[attribute]) {
    states[attribute] = [];
  }

  const history = states[attribute];
  history.push(state);

  states[attribute] = history.slice(-10);

  if (attribute === selectedState) {
    renderHistory();
  }

  const id = `attribute-${attribute}-row`;

  const existingRow = document.getElementById(id);
  if (existingRow) {
    existingRow.querySelector('.value').innerText = JSON.stringify(value);
  } else {
    const row = document.createElement('tr');
    row.id = id;

    const link = document.createElement('a');
    link.setAttribute('onclick', `selectState('${attribute}')`);
    link.href = '#';
    link.title = attribute;

    link.appendChild(document.createTextNode(attribute));

    const nameCell = document.createElement('td');
    nameCell.classList.add('attribute');
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
