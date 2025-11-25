
document.addEventListener('DOMContentLoaded', () => {
  const output = document.getElementById('output');

  document.getElementById('compare-btn').addEventListener('click', async () => {
    const oldFile = document.getElementById('old-json').files[0];
    const newFile = document.getElementById('new-json').files[0];

    if (!oldFile || !newFile) {
      alert('Merci de sélectionner deux fichiers .json.');
      return;
    }

    const [oldText, newText] = await Promise.all([
      oldFile.text(),
      newFile.text()
    ]);

    try {
      const oldData = JSON.parse(oldText);
      const newData = JSON.parse(newText);

      const oldVehicles = Object.fromEntries(oldData.vehicleList.map(v => [v.id, v]));
      const newVehicles = Object.fromEntries(newData.vehicleList.map(v => [v.id, v]));

      const added = [];
      const removed = [];
      const brChanges = [];
      const typeChanges = [];

      for (const [id, newV] of Object.entries(newVehicles)) {
        if (!oldVehicles[id]) {
          added.push(newV);
        } else {
          const oldV = oldVehicles[id];
          if (newV.br !== oldV.br) {
            brChanges.push({ name: newV.name, old_br: oldV.br, new_br: newV.br });
          }
          if (newV.type !== oldV.type) {
            typeChanges.push({ name: newV.name, old_type: oldV.type, new_type: newV.type });
          }
        }
      }

      for (const [id, oldV] of Object.entries(oldVehicles)) {
        if (!newVehicles[id]) {
          removed.push(oldV);
        }
      }

      const updateName = prompt("📝 Entrez le nom de la mise à jour :", "");
      if (!updateName || updateName.trim() === "") {
        alert("⚠️ Nom de mise à jour requis !");
        return;
      }

      let alertPrix = [];
      let result = `📌 Patch Note – ${updateName}\n\n`;

      // DÉTECTION DES PACKS PREMIUM PAR parentId
      const packMap = {};
      const singles = [];

      for (const v of added) {
        if (v.type === "premium" && v.connection === "folder" && v.parentId) {
          if (!packMap[v.parentId]) packMap[v.parentId] = [];
          packMap[v.parentId].push(v);
        } else {
          singles.push(v);
        }
      }

      for (const [folderId, group] of Object.entries(packMap)) {
        if (group.length > 1) {
          const packName = prompt(`🎁 Nom du pack premium contenant ${group.length} véhicules ?`, "Nom du pack");
          const packPrice = prompt("💰 Prix du pack premium ?", "");
          result += `🎁 **Pack Premium : ${packName} (${packPrice} GE)**\n`;
          for (const v of group) {
            result += `- ${v.name} (BR ${v.br})\n`;
          }
          result += '\n';
        } else {
          singles.push(...group); // Trop petit pour être un pack
        }
      }

      if (singles.length) {
        result += '🚗 **Nouveaux véhicules :**\n';
        for (const v of singles) {
          if (v.type !== 'researchable' && v.type !== 'Réserve') {
            if (!v.price) {
              let prix = prompt(`💰 Prix pour ${v.name} (${v.type}) ?`, "");
              if (!prix || prix.trim() === "") {
                alertPrix.push(v.name);
              } else {
                v.price = prix.trim();
              }
            }
          }
          result += `- ${v.name} (${v.type}) – BR ${v.br}${v.price ? ` (${v.price} GE)` : ''}\n`;
        }
        result += '\n';
      }

      if (removed.length) {
        result += '❌ **Véhicules supprimés :**\n';
        for (const v of removed) {
          result += `- ${v.name} (BR ${v.br}, ${v.type})\n`;
        }
        result += '\n';
      }

      if (brChanges.length) {
        result += '🔧 **Changements de BR :**\n';
        for (const c of brChanges) {
          result += `- ${c.name} : ${c.old_br} → ${c.new_br}\n`;
        }
        result += '\n';
      }

      if (typeChanges.length) {
        result += '🔄 **Changements de statut :**\n';
        for (const c of typeChanges) {
          result += `- ${c.name} : ${c.old_type} → ${c.new_type}\n`;
        }
        result += '\n';
      }

      if (alertPrix.length > 0) {
        alert("⚠️ Tu dois renseigner le prix de ces véhicules :\n" + alertPrix.join("\n"));
        return;
      }

      output.textContent = result.trim();
    } catch (e) {
      output.textContent = '❌ Erreur lors de l analyse des fichiers JSON.';
    }
  });
});
