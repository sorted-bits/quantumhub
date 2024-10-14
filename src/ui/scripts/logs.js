let loggingWs;
let logLevel = localStorage.getItem(`${identifier}-logLevel`) || 'info';
let logPaused = false;

const setButtonState = (level) => {
    ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((level) => {
        const tab = document.getElementById(`${level}-filter`);
        tab.classList.remove('is-active');
    });

    const tab = document.getElementById(`${level}-filter`);
    tab.classList.add('is-active');
};

const setPauseButtonState = (paused) => {
    const button = document.getElementById('pause-logs');
    button.innerText = paused ? 'Resume' : 'Pause';
};

/* <span class='tag is-success' id='availability_{{identifier}}_chip'>AVAILABLE</span> */
const createTagForLevel = (level) => {
    const tag = document.createElement('span');
    tag.classList.add('tag');
    tag.innerText = level;

    switch (level) {
        case 'TRACE':
            tag.classList.add('is-light');
            break;
        case 'DEBUG':
            tag.classList.add('is-light');
            break;
        case 'INFO':
            tag.classList.add('is-info');
            break;
        case 'WARN':
            tag.classList.add('is-warning');
            break;
        case 'ERROR':
            tag.classList.add('is-danger');
            break;
        case 'FATAL':
            tag.classList.add('is-danger');
            break;
    }

    return tag.outerHTML;
};

const createTagForName = (name) => {
    const tag = document.createElement('span');
    tag.classList.add('tag');
    tag.innerText = name;

    switch (name.toLowerCase()) {
        case 'statemanager':
        case 'mqtt':
        case 'webserver':
        case 'hub':
        case 'processmanager':
            tag.classList.add('is-light');
            break;
        default:
            tag.classList.add('is-primary');
            break;
    }

    return tag.outerHTML;
};

const subscribeToLogs = (attribute, level) => {
    const tableBody = document.getElementById('logs');
    tableBody.innerHTML = '';

    loggingWs = processLogsSubscription(attribute, level, (data) => {
        if (logPaused) {
            return;
        }

        const log = [data.message, ...data.messages];
        const messages = log.join(', ');
        const row = document.createElement('tr');
        row.innerHTML = `<td>${data.time}</td><td class='level-cell'>${createTagForLevel(data.level)}</td><td class='name-cell'>${createTagForName(data.name)}</td><td>${messages}</td>`;
        tableBody.prepend(row);

        if (tableBody.childElementCount > 30) {
            tableBody.removeChild(tableBody.lastChild);
        }
    });
};

const pauseLogs = () => {
    logPaused = !logPaused;
    setPauseButtonState(logPaused);

    console.log('Logs paused', logPaused);
};

const filterLogs = (attribute, level) => {
    logLevel = level;

    if (loggingWs) {
        loggingWs.close();
    }

    setButtonState(level);
    subscribeToLogs(attribute, level);

    localStorage.setItem(`${attribute}-logLevel`, level);
};