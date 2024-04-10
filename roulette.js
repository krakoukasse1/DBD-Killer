document.addEventListener("DOMContentLoaded", function() {
    // Récupérer les données des personnages sélectionnés depuis localStorage
    const activeCharactersJSON = localStorage.getItem('activeCharacters');
    const activeCharacters = JSON.parse(activeCharactersJSON);

    // Vérifier si des personnages sont sélectionnés
    if (activeCharacters && activeCharacters.length > 0) {
        const rouletteItems = document.getElementById('roulette-items');

        // Afficher chaque personnage dans la roulette
        for (let i = 0; i < 3; i++) {
            activeCharacters.forEach(character => {
                const item = document.createElement('div');
                item.className = 'item';

                const img = document.createElement('img');
                img.src = character.img;
                item.appendChild(img);

                rouletteItems.appendChild(item);
            });
        }
        const items = document.querySelectorAll('.item');
        const totalItems = items.length;
        console.log(totalItems)

        // Fonction pour sélectionner un gagnant aléatoire
        function selectWinner(totalItems) {
            return Math.floor(Math.random() *(totalItems - 5)) + 5;
        }

        const winnerIndex = selectWinner(totalItems);
        console.log(winnerIndex);
        
        // Fonction pour faire tourner la roulette et afficher le vainqueur
        function spinRoulette(winnerIndex) {
            const rouletteItems = document.getElementById('roulette-items');
            const redLine = document.querySelector('.red-line');
            const items = document.querySelectorAll('.item');
            
            
            const itemWidth = items[0].offsetWidth; // Largeur d'un élément dans la roulette
            const rouletteWidth = rouletteItems.offsetWidth; // Largeur totale de la roulette
            
            const winnerPosition = (winnerIndex * itemWidth) + (itemWidth / 2) -1050; // Position X du vainqueur
            
            const startPosition = 0;
            const endPosition = winnerPosition - (rouletteWidth / 2); // Position finale de la roulette

            // Animation pour faire défiler la roulette jusqu'à la position finale
           

        // Attendre un court délai pour que la transition soit appliquée
        setTimeout(() => {
            // Arrêter l'animation et aligner le vainqueur avec la ligne rouge
            rouletteItems.style.transition = 'ease-in-out 5s';
            rouletteItems.style.transform = `translateX(-${winnerPosition}px)`;
            console.log(totalItems, itemWidth, rouletteWidth, winnerIndex, winnerPosition, endPosition)
            
        }, 500); // Attendre 500 millisecondes pour que la transition soit appliquée

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
        
        // Appel à la fonction selectWinner pour obtenir l'index du gagnant
        

        // Appel à la fonction spinRoulette pour faire tourner la roulette et afficher le vainqueur
        spinRoulette(winnerIndex);
    }
});
