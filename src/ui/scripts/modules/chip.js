function setChip(identifier, value, text) {
  const color = value ? 'success' : 'danger';
  const chip = document.getElementById(identifier);
  chip.innerText = text;
  chip.classList.remove('is-danger');
  chip.classList.remove('is-success');
  chip.classList.add(`is-${color}`);
}
