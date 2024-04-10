document.addEventListener("DOMContentLoaded", function() {
    // Récupérer les données des personnages sélectionnés depuis localStorage
    const activeCharactersJSON = localStorage.getItem('activeCharacters');
    let activeCharacters = JSON.parse(activeCharactersJSON);

    // Récupérer le paramètre "type" de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const characterType = urlParams.get('type');

    console.log(characterType)

    // Vérifier si des personnages sont sélectionnés dans le localStorage
    if (activeCharacters && activeCharacters.length > 0) {
        // Des personnages sont sélectionnés dans le localStorage, les afficher
        displayCharacters(activeCharacters, "null");
        initiateRoulette(activeCharacters);
    } else {
        // Aucun personnage sélectionné dans le localStorage, vérifier le type dans l'URL
        if (characterType === 'killer') {
            // Afficher tous les tueurs
            fetch('data.json')
                .then(response => response.json())
                .then(data => {
                    const killers = data.killers;
                    activeCharacters = killers;
                    displayCharacters(activeCharacters, "killer");
                    initiateRoulette(activeCharacters);
                });
        } else if (characterType === 'survivor') {
            // Afficher tous les survivants
            fetch('data.json')
                .then(response => response.json())
                .then(data => {
                    const survivors = data.survivors;
                    activeCharacters = survivors;
                    displayCharacters(activeCharacters, "survivor");
                    initiateRoulette(activeCharacters);
                });
        } else {
            // Ni "killer" ni "survivor" dans l'URL, afficher tous les tueurs par défaut
            fetch('data.json')
                .then(response => response.json())
                .then(data => {
                    
                });
        }
    }

    function displayCharacters(characters, type) {
        const rouletteItems = document.getElementById('roulette-items');
        rouletteItems.innerHTML = ''; // Effacer les éléments existants avant d'ajouter de nouveaux éléments
        
        for (let i = 0; i < 3; i++) {
            characters.forEach(character => {
                const item = document.createElement('div');
                item.className = 'item';
                const img = document.createElement('img');
                // Utiliser le chemin complet de l'image en fonction du type de personnage (tueur ou survivant)
                if (activeCharactersJSON) {
                    img.src = character.img;
                    console.log("Boucle 1")
                    console.log(activeCharactersJSON)
                }
                else{
                    const imagePath = characterType === 'killer' ? 'assets/Killer/' : 'assets/Survivor/';
                    img.src = `${imagePath}${character.img}`;
                    console.log("Boucle 2" + type)
                }
                item.appendChild(img);
                rouletteItems.appendChild(item);
            });
        }
    }

    

    function initiateRoulette(activeCharacters) {
        const items = document.querySelectorAll('.item');
        const totalItems = items.length;
        console.log(totalItems);

        // Fonction pour sélectionner un gagnant aléatoire
        function selectWinner(totalItems) {
            return Math.floor(Math.random() * (totalItems - 5)) + 5;
        }

        const winnerIndex = selectWinner(totalItems);
        console.log(winnerIndex);

        // Fonction pour faire tourner la roulette et afficher le vainqueur
        function spinRoulette(winnerIndex) {
            const rouletteItems = document.getElementById('roulette-items');
            const redLine = document.querySelector('.red-line');
            const itemWidth = items[0].offsetWidth; // Largeur d'un élément dans la roulette
            const rouletteWidth = rouletteItems.offsetWidth; // Largeur totale de la roulette
            const winnerPosition = (winnerIndex * itemWidth) + (itemWidth / 2) - 1050; // Position X du vainqueur

            // Animation pour faire défiler la roulette jusqu'à la position finale
            rouletteItems.style.transition = 'transform 5s ease-out';
            rouletteItems.style.transform = `translateX(-${winnerPosition}px)`;

            // Attendre un court délai pour que la transition soit appliquée
            setTimeout(() => {
                // Arrêter l'animation et aligner le vainqueur avec la ligne rouge
                rouletteItems.style.transition = 'ease-in-out 5s';
                rouletteItems.style.transform = `translateX(-${winnerPosition}px)`;
                console.log(totalItems, itemWidth, rouletteWidth, winnerIndex, winnerPosition);
            }, 500); // Attendre 500 millisecondes pour que la transition soit appliquée

            // Attendre 5 secondes après l'animation pour afficher le vainqueur
            setTimeout(() => {
                const validWinnerIndex = winnerIndex % activeCharacters.length;
                items[winnerIndex].classList.add('selected-item');
                const selectedCharacterName = activeCharacters[validWinnerIndex].name;

                // Créer un élément de paragraphe pour afficher le nom du personnage
                const winnerMessage = document.createElement('p');
                winnerMessage.textContent = `Vous avez tiré : ${selectedCharacterName}`;
                // Sélectionner la balise div avec la classe winner
                const winnerContainer = document.querySelector('.winner');
                // Ajouter le message du vainqueur à la balise div
                winnerContainer.appendChild(winnerMessage);
            }, 6000);
        }

        // Appel à la fonction spinRoulette pour faire tourner la roulette et afficher le vainqueur
        spinRoulette(winnerIndex);
    }
});
