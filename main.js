fetch('data.json')
    .then(response => response.json())
    .then(data => {
        const KillerList = data.killers.map(killer => ({ ...killer, active: true }));
        const SurvivorList = data.survivors.map(survivor => ({ ...survivor, active: true }));

        const SurvivorPath = "assets/Survivor/";
        const KillerPath = "assets/Killer/";
        const container = document.getElementById("character-container");

        function toggleActive(character) {
            character.active = !character.active;
            const characterElement = document.getElementById(character.name);
            if (character.active) {
                characterElement.classList.remove('inactive');
            } else {
                characterElement.classList.add('inactive');
            }
        }

        function addCharacter(type, characters){
            characters.forEach((character) => {
                const div = document.createElement('div');
                div.className = `character ${character.active ? '' : 'inactive'}`;
                div.id = character.name;
                container.appendChild(div);

                const imgCharacter = document.createElement('img');
                imgCharacter.src = `${type === 1 ? KillerPath : SurvivorPath}${character.img}`;
                imgCharacter.className = 'img-characterlist';
                imgCharacter.addEventListener('click', () => {
                    toggleActive(character);
                    if (!character.active) {
                        imgCharacter.style.opacity = 0.5;
                    } else {
                        imgCharacter.style.opacity = 1;
                    }
                });
                div.appendChild(imgCharacter);

                const name = document.createElement('p');
                name.className = 'name-character';
                name.innerHTML = character.name;
                div.appendChild(name);
            });
        }

        const urlParams = new URLSearchParams(window.location.search);
        const characterType = urlParams.get('type');

        if (characterType === 'Killer') {
            addCharacter(1, KillerList);
            console.log('yes');
        } else if (characterType === 'Survivor') {
            addCharacter(0, SurvivorList);
            console.log('no');
        }

        // Gestionnaire d'événement pour le bouton de tirage
        const rouletteDrawButton = document.querySelector('.roulette-draw');
        rouletteDrawButton.addEventListener('click', function() {
            // Stocker les données des personnages sélectionnés dans localStorage
            const activeCharactersJSON = JSON.stringify(getActiveCharacters());
            // Afficher dans la console ce qui est envoyé à la page index.html
            console.log("Données envoyées à index.html:", activeCharactersJSON);
            localStorage.setItem('activeCharacters', activeCharactersJSON);
            // Redirection vers index.html
            window.location.href = 'roulette.html';
        });

        function getActiveCharacters() {
            const characters = document.querySelectorAll('.character');
            const activeCharacters = [];
            characters.forEach(character => {
                if (!character.classList.contains('inactive')) {
                    activeCharacters.push({
                        name: character.id,
                        img: character.querySelector('img').src
                    });
                }
            });
            return activeCharacters;
        }
    });
