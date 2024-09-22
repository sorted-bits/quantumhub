const registerTabs = () => {
  const tabs = document.querySelectorAll('.tabs ul li a');

  tabs.forEach((tab) => {
    tab.addEventListener('click', switchTab);
  });
};

const switchTab = (event) => {
  event.preventDefault();
  const parent = event.target.parentElement;
  const isActive = parent.classList.contains('is-active');

  if (isActive) {
    return;
  }

  const list = parent.parentElement;
  const items = list.querySelectorAll('li');
  items.forEach((item) => {
    item.classList.remove('is-active');
  });

  parent.classList.add('is-active');
  const currentHref = event.target.getAttribute('href');
  const contentContainerId = currentHref.replace('#', '');

  const tabsContainer = list.parentElement.parentElement;
  console.log(tabsContainer);

  const tabContents = tabsContainer.querySelectorAll('.tab-content');
  tabContents.forEach((item) => {
    if (item.id === contentContainerId) {
      item.classList.remove('is-hidden');
    } else {
      item.classList.add('is-hidden');
    }
  });
};

registerTabs();
