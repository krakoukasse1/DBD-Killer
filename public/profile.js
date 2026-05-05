let selectedKillers = [];
let selectedSurvivors = [];

async function init() {
  const user = await fetch('/api/twitch-user').then(r => r.json());

  if (!user.connected) {
    window.location.href = "/";
    return;
  }

  document.getElementById("avatar").src = user.avatar;
  document.getElementById("username").value = user.display_name;

  loadCharacters();
  loadProfile();
}

function toggleSection(id) {
  document.getElementById(id).classList.toggle("active");
}

async function loadCharacters() {
  const data = await fetch("data.json").then(r => r.json());

  createList("killer", data.killers, selectedKillers);
  createList("survivor", data.survivors, selectedSurvivors);
}

function createList(containerId, list, selectedList) {
  const container = document.getElementById(containerId);

  list.forEach(char => {
    const img = document.createElement("img");
    img.src = `assets/${containerId === "killer" ? "Killer" : "Survivor"}/${char.img}`;

    img.onclick = () => {
      img.classList.toggle("selected");

      if (selectedList.includes(char.name)) {
        selectedList.splice(selectedList.indexOf(char.name), 1);
      } else {
        selectedList.push(char.name);
      }
    };

    container.appendChild(img);
  });
}

async function loadProfile() {
  const data = await fetch('/api/profile').then(r => r.json());

  selectedKillers = data.killers || [];
  selectedSurvivors = data.survivors || [];

  document.getElementById("streamerMode").checked = data.streamerMode;
  document.getElementById("anonymousMode").checked = data.anonymousMode;

  loadHistory(data.history);
}

function loadHistory(history) {
  const tbody = document.querySelector("#history tbody");

  history.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.date}</td>
      <td>${item.type}</td>
      <td>${item.name}</td>
    `;

    tbody.appendChild(tr);
  });
}

document.getElementById("saveBtn").onclick = async () => {
  await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      killers: selectedKillers,
      survivors: selectedSurvivors,
      streamerMode: document.getElementById("streamerMode").checked,
      anonymousMode: document.getElementById("anonymousMode").checked
    })
  });

  alert("Profil sauvegardé !");
};

init();