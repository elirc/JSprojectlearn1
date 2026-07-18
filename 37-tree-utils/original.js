// Comments come from the database FLAT (each row knows its parent);
// the UI wants them NESTED (each comment holding its replies).

var rows = [
  { id: 1, parentId: null, text: "First!" },
  { id: 2, parentId: 1, text: "Actually..." },
  { id: 3, parentId: 2, text: "Well, actually..." },
  { id: 4, parentId: null, text: "Great post" },
  { id: 5, parentId: 4, text: "Agreed" },
];

// Nest them: one loop per level of depth. Literally.
function buildTree(rows) {
  var roots = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].parentId == null) {
      var root = { id: rows[i].id, text: rows[i].text, children: [] };
      // level 2
      for (var j = 0; j < rows.length; j++) {
        if (rows[j].parentId == root.id) {
          var child = { id: rows[j].id, text: rows[j].text, children: [] };
          // level 3
          for (var k = 0; k < rows.length; k++) {
            if (rows[k].parentId == child.id) {
              child.children.push({ id: rows[k].id, text: rows[k].text, children: [] });
              // level 4? Copy the loop again. Level 5? Again.
              // Reply to "Well, actually..." and it SILENTLY VANISHES
              // from the page — there's no fourth loop to find it.
            }
          }
          root.children.push(child);
        }
      }
      roots.push(root);
    }
  }
  return roots;
}

console.log(JSON.stringify(buildTree(rows), null, 2));

// And to render indented text, the same staircase all over again:
var tree = buildTree(rows);
for (var a = 0; a < tree.length; a++) {
  console.log(tree[a].text);
  for (var b = 0; b < tree[a].children.length; b++) {
    console.log("  " + tree[a].children[b].text);
    for (var c = 0; c < tree[a].children[b].children.length; c++) {
      console.log("    " + tree[a].children[b].children[c].text);
    }
  }
}
