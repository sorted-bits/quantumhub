var states = [];
var selectedState = undefined;

function processStateSubscription(identifier, callback) {
  console.log('Starting state subscription', identifier);

  let ws = new WebSocket(`/api/process/${identifier}/state`);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };
}

processStateSubscription(identifier, (state) => {
  const table = document.getElementById('attribute-list');
  const keys = Object.keys(state);

  keys.forEach((key) => {
    const value = state[key];
    const id = `attribute-${key}-row`;

    const existingRow = document.getElementById(id);
    if (existingRow) {
      existingRow.querySelector('.value').innerText = JSON.stringify(value);
    } else {
      const row = document.createElement('tr');
      row.id = id;

      const link = document.createElement('a');
      link.onclick = `selectState('${key}')`;
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
