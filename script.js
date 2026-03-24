document.addEventListener('DOMContentLoaded', () => {
  const btnGenerate = document.getElementById('generate-btn');
  const btnCopy = document.getElementById('copy-btn');
  const output = document.getElementById('output');

  btnGenerate.addEventListener('click', async () => {
    const oldFile = document.getElementById('old-json').files[0];
    const newFile = document.getElementById('new-json').files[0];

    if (!oldFile || !newFile) {
      alert('⚠️ Tu dois sélectionner les deux fichiers JSON.');
      return;
    }

    try {
      // Lecture des fichiers
      const oldData = JSON.parse(await oldFile.text());
      const newData = JSON.parse(await newFile.text());

      // Création de cartes (Map) pour trouver les véhicules instantanément
      const oldVehicles = new Map(oldData.vehicleList.map(v => [v.id, v]));
      const newVehicles = new Map(newData.vehicleList.map(v => [v.id, v]));

      const changes = { added: [], removed: [], br: [], type: [] };

      // 1. Chercher les ajouts et les modifications
      for (const [id, newV] of newVehicles) {
        if (!oldVehicles.has(id)) {
          changes.added.push(newV);
        } else {
          const oldV = oldVehicles.get(id);
          if (newV.br !== oldV.br) changes.br.push({ name: newV.name, old: oldV.br, new: newV.br });
          if (newV.type !== oldV.type) changes.type.push({ name: newV.name, old: oldV.type, new: newV.type });
        }
      }

      // 2. Chercher les suppressions
      for (const [id, oldV] of oldVehicles) {
        if (!newVehicles.has(id)) changes.removed.push(oldV);
      }

      // 3. Construction du texte
      const updateName = prompt("📝 Nom de la mise à jour ?", "Version 1.1") || "Nouvelle Version";
      let result = `📌 Patch Note – ${updateName}\n\n`;

      // Traitement des Nouveautés
      if (changes.added.length > 0) {
        result += '🚗 **Nouveaux véhicules :**\n';
        
        const packs = {};
        const singles = [];

        // Trier les véhicules par "follow"
        changes.added.forEach(v => {
          if (v.type === "premium" && v.follow) {
            if (!packs[v.follow]) packs[v.follow] = [];
            packs[v.follow].push(v);
          } else {
            singles.push(v);
          }
        });

        // Ajouter les packs au texte
        for (const [parentId, group] of Object.entries(packs)) {
           const packName = prompt(`🎁 Nom du Pack Premium détecté ?`, "Nom du Pack");
           const packPrice = prompt(`💰 Prix global du Pack (GE) ?`, "");
           result += `\n🎁 **Pack Premium : ${packName} ${packPrice ? `(${packPrice} GE)` : ''}**\n`;
           group.forEach(v => result += `  - ${v.name} (BR ${v.br})\n`);
        }
        if (Object.keys(packs).length > 0) result += '\n';

        // Ajouter les véhicules seuls
        singles.forEach(v => {
          let priceStr = "";
          if (["premium", "squadron", "event"].includes(v.type)) {
            const price = prompt(`💰 Prix pour ${v.name} (${v.type}) ?`, "");
            if (price) priceStr = ` (${price} GE)`;
          }
          result += `- ${v.name} (${v.type}) – BR ${v.br}${priceStr}\n`;
        });
        result += '\n';
      }

      // Traitement des Suppressions
      if (changes.removed.length > 0) {
        result += '❌ **Véhicules supprimés :**\n';
        changes.removed.forEach(v => result += `- ${v.name} (BR ${v.br}, ${v.type})\n`);
        result += '\n';
      }

      // Traitement des Changements BR
      if (changes.br.length > 0) {
        result += '🔧 **Changements de BR :**\n';
        changes.br.forEach(c => result += `- ${c.name} : ${c.old} → ${c.new}\n`);
        result += '\n';
      }

      // Traitement des Changements de Type
      if (changes.type.length > 0) {
        result += '🔄 **Changements de statut :**\n';
        changes.type.forEach(c => result += `- ${c.name} : ${c.old} → ${c.new}\n`);
        result += '\n';
      }

      // Afficher le résultat
      output.textContent = result.trim();

    } catch (error) {
      console.error(error);
      output.textContent = "❌ Erreur : Impossible de lire les fichiers. Sont-ils bien des fichiers JSON valides ?";
    }
  });

  // Fonction pour copier le texte
  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(output.textContent).then(() => {
      btnCopy.textContent = "✅ Copié !";
      setTimeout(() => btnCopy.textContent = "📋 Copier", 2000); // Remet le texte normal après 2 secondes
    });
  });
});