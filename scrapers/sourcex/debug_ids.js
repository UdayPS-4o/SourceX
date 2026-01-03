const fs = require('fs');
const data = JSON.parse(fs.readFileSync('output/inventory-data.json', 'utf-8'));

console.log('Inventory ID sample:', data.inventory[0].id);
if (data.lowest && data.lowest.length > 0) {
    console.log('Lowest ID sample:', data.lowest[0].id);
}
if (data.notLowest && data.notLowest.length > 0) {
    console.log('NotLowest ID sample:', data.notLowest[0].id);
}
