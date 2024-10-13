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

  stateDetails.querySelectorAll('.state-attribute-details').forEach((detail) => {
    detail.style.display = 'none';
  });

  const attributeDetails = document.getElementById(`state-attribute-${key}`);
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

  // attribute-debug_amsterdam_clock-random_temperature-state-value
  const valuePrefix = `attribute-${identifier}-${attribute.key}-`;
  console.log(state);

  for (const key in value) {
    const valueId = `${valuePrefix}${key}-value`;
    const existingValue = document.getElementById(valueId);
    if (existingValue) {
      if (typeof value[key] === 'object') {
        existingValue.innerText = JSON.stringify(value[key]);
      } else {
        existingValue.innerText = value[key];
      }
    }
  }
});
