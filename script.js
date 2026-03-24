document.addEventListener('DOMContentLoaded', () => {
  const btnGenerate = document.getElementById('generate-btn');
  const btnCopy = document.getElementById('copy-btn');
  const output = document.getElementById('output');

  function getCleanName(filename) {
    return filename.toLowerCase().replace(/\s\(\d+\)/g, '');
  }

  const classMap = {
    'lt': 'Char Léger',
    'mt': 'Char Moyen',
    'ht': 'Char Lourd',
    'td': 'Chasseur de Chars',
    'spaa': 'Anti-Aérien',
    'fighter': 'Chasseur',
    'bomber': 'Bombardier'
  };

  btnGenerate.addEventListener('click', async () => {
    const oldFiles = Array.from(document.getElementById('old-json').files);
    const newFiles = Array.from(document.getElementById('new-json').files);

    if (oldFiles.length === 0 || newFiles.length === 0) {
      alert('⚠️ Tu dois sélectionner au moins un fichier JSON dans chaque case.');
      return;
    }

    output.textContent = "⏳ Analyse et formatage en cours...";

    const newFilesMap = new Map();
    newFiles.forEach(f => newFilesMap.set(getCleanName(f.name), f));

    const allCountriesData = {};
    const globalBRChanges = {};
    const globalRemoved = {};

    let hasGlobalChanges = false;

    for (const oldFile of oldFiles) {
      const cleanOldName = getCleanName(oldFile.name);
      
      // SUPPRESSION DU "_BACKUP" POUR UN AFFICHAGE PROPRE
      let rawCountryName = cleanOldName.replace('.json', '').replace('_backup', '').replace('-backup', '');
      let countryName = rawCountryName.length <= 3 ? rawCountryName.toUpperCase() : rawCountryName.charAt(0).toUpperCase() + rawCountryName.slice(1);
      
      let newFile;
      if (oldFiles.length === 1 && newFiles.length === 1) {
        newFile = newFiles[0];
      } else {
        newFile = newFilesMap.get(cleanOldName);
      }

      if (!newFile) continue;

      try {
        const oldData = JSON.parse(await oldFile.text());
        const newData = JSON.parse(await newFile.text());

        const oldVehicles = new Map(oldData.vehicleList.map(v => [v.id, v]));
        const newVehicles = new Map(newData.vehicleList.map(v => [v.id, v]));

        const changes = { added: [], removed: [], br: [] };

        for (const [id, newV] of newVehicles) {
          if (!oldVehicles.has(id)) {
            changes.added.push(newV);
          } else {
            const oldV = oldVehicles.get(id);
            if (newV.br !== oldV.br) changes.br.push({ name: newV.name, old: oldV.br, new: newV.br });
          }
        }

        for (const [id, oldV] of oldVehicles) {
          if (!newVehicles.has(id)) changes.removed.push(oldV);
        }

        if (changes.added.length > 0 || changes.removed.length > 0 || changes.br.length > 0) {
          hasGlobalChanges = true;
          
          allCountriesData[countryName] = { ranks: {}, packs: [] };
          
          const packsMap = {};
          
          changes.added.forEach(v => {
            if (v.type === "premium" && v.follow) {
              if (!packsMap[v.follow]) packsMap[v.follow] = [];
              packsMap[v.follow].push(v);
            } else {
              if (!allCountriesData[countryName].ranks[v.rank]) {
                allCountriesData[countryName].ranks[v.rank] = [];
              }
              allCountriesData[countryName].ranks[v.rank].push(v);
            }
          });

          // Création des Packs Premium
          for (const [followId, group] of Object.entries(packsMap)) {
            // Calcul du prix du pack par défaut basé sur le rang max des véhicules dedans
            let maxRank = Math.max(...group.map(v => v.rank));
            let defaultPackPrice = "7500"; // Rang 5 par défaut
            if (maxRank === 6) defaultPackPrice = "9500";
            if (maxRank >= 7) defaultPackPrice = "11500";

            const packName = prompt(`[${countryName}] 🎁 Nom du Pack Premium ?`, "Nom du Pack");
            const packPrice = prompt(`[${countryName}] 💰 Prix du Pack (GE) ?`, defaultPackPrice);
            const packGE = prompt(`[${countryName}] 💎 Combien de GE inclus dans ce pack ?`, "2000");
            const packDays = prompt(`[${countryName}] 📅 Combien de jours Premium inclus ?`, "15");
            
            allCountriesData[countryName].packs.push({
              name: packName,
              price: packPrice,
              ge: packGE,
              days: packDays,
              vehicles: group
            });
          }

          if (changes.br.length > 0) {
            globalBRChanges[countryName] = changes.br;
          }

          if (changes.removed.length > 0) {
            globalRemoved[countryName] = changes.removed;
          }
        }
      } catch (error) {
        console.error(`Erreur avec le fichier ${oldFile.name}`, error);
      }
    }

    if (!hasGlobalChanges) {
      output.textContent = "🤷 Aucun changement détecté entre les fichiers fournis.";
      return;
    }

    let resultText = "";

    for (const [country, data] of Object.entries(allCountriesData)) {
      if (Object.keys(data.ranks).length === 0 && data.packs.length === 0) continue;

      resultText += `**${country} :**\n`;

      const sortedRanks = Object.keys(data.ranks).sort((a, b) => parseInt(a) - parseInt(b));

      sortedRanks.forEach(rank => {
        resultText += `  Rang ${rank} :\n`;
        
        data.ranks[rank].forEach(v => {
          const vClass = classMap[v.classIcon] || "Véhicule";
          let tags = [`BR : ${v.br}`, vClass];
          
          if (v.type === 'premium') tags.push('Premium');
          if (v.type === 'event') tags.push('Event');
          if (v.type === 'squadron') tags.push('Esquadron');

          if (['premium', 'squadron'].includes(v.type)) {
             // Calcul du prix individuel par défaut basé sur War Thunder
             let defaultPrice = "500";
             if (v.rank == 2) defaultPrice = "1000";
             else if (v.rank == 3) defaultPrice = "1500";
             else if (v.rank == 4) defaultPrice = "3000";
             else if (v.rank == 5) defaultPrice = "4600";
             else if (v.rank == 6) defaultPrice = "8000";
             else if (v.rank >= 7) defaultPrice = "9500";

             // Prix spécifique pour les escadrons (souvent plus chers à l'achat direct)
             if (v.type === 'squadron') {
                defaultPrice = v.rank >= 6 ? "6000" : "3800";
             }

             const price = prompt(`[${country}] 💰 Prix pour ${v.name} (${v.type}, Rang ${v.rank}) ?`, defaultPrice);
             if (price) tags.push(`${price} GE`);
          }

          resultText += `- ${v.name} (${tags.join(', ')})\n`;
        });
      });

      if (data.packs.length > 0) {
        resultText += `  Packs Premium :\n`;
        data.packs.forEach(pack => {
          resultText += `- ${pack.name} (Pack Premium, ${pack.price} GE)\n`;
          resultText += `  Contenu :\n`;
          if (pack.ge && pack.ge !== "0") resultText += `    - ${pack.ge} GE\n`;
          if (pack.days && pack.days !== "0") resultText += `    - ${pack.days} jours Premium\n`;
          pack.vehicles.forEach(v => {
            resultText += `    - ${v.name} (BR : ${v.br}, Rang : ${v.rank})\n`;
          });
        });
      }
      resultText += `\n`;
    }

    if (Object.keys(globalBRChanges).length > 0) {
      resultText += `⚙️ **Changements de BR :**\n`;
      for (const [country, changes] of Object.entries(globalBRChanges)) {
        resultText += `**${country} :**\n`;
        changes.forEach(c => {
          resultText += `🔧 ${c.name} : ${c.old} -> ${c.new}\n`;
        });
        resultText += `\n`;
      }
    }

    if (Object.keys(globalRemoved).length > 0) {
      resultText += `❌ **Véhicules retirés du jeu :**\n`;
      for (const [country, changes] of Object.entries(globalRemoved)) {
        changes.forEach(v => {
           resultText += `- ${v.name} (${country})\n`;
        });
      }
    }

    output.textContent = resultText.trim();
  });

  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(output.textContent).then(() => {
      btnCopy.textContent = "✅ Copié !";
      setTimeout(() => btnCopy.textContent = "📋 Copier", 2000);
    });
  });
});