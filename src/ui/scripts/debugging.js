const generateNotification = (parentElement, message, type = 'success') => {
  const notification = document.createElement('div');
  const classes = ['notification', `is-${type}`, 'is-light'];
  notification.classList.add(...classes);
  notification.innerHTML = message;
  parentElement.appendChild(notification);

  if (type === 'success') {
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
};

const sendDebugEvent = async (identifier, event) => {
  const eventBlock = document.getElementById(event);

  eventBlock.querySelector('.notification')?.remove();

  var data = {};
  data.event = event;

  var hasError = false;

  const parameters = eventBlock.querySelectorAll('.debug-event-parameter');
  parameters.forEach((parameter) => {
    parameter.classList.remove('is-danger');

    if (!parameter.value) {
      parameter.classList.add('is-danger');
      if (!hasError) {
        parameter.focus();
        hasError = true;
      }
    } else {
      parameter.classList.add('is-success');
    }

    data[parameter.dataset.name] = parameter.value;
  });

  if (hasError) {
    return;
  }

  console.log('Sending debug event', event);
  console.log(data);

  fetch(`/api/process/${identifier}/debug`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(data),
  })
    .then((response) => {
      console.log('Response', response);

      generateNotification(eventBlock, 'Event sent', 'success');
    })
    .catch((error) => {
      console.error('Error', error);
      generateNotification(eventBlock, `Error sending event: ${error}`, 'danger');
    });
};
